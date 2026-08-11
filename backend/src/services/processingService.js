import { env } from '../config/env.js';
import * as sessionRepository from '../repositories/sessionRepository.js';

import { createHaversineAccumulator } from './metrics/haversineCalculator.js';
import { createMaxSpeedTracker } from './metrics/maxSpeedTracker.js';
import { createSprintDetector } from './metrics/sprintDetector.js';
import { createPlayerLoadCalculator } from './metrics/playerLoadCalculator.js';
import { createGpsFilter } from './metrics/gpsFilter.js';
import { createGpsInterpolator } from './metrics/gpsInterpolator.js';

export class ProcessingService {
  constructor(sessionId, pool) {
    this.sessionId = sessionId;
    this.pool = pool;
    this.gpsBuffer = [];
    this.imuBuffer = [];
    this.gpsBatchSize = env.GPS_BATCH_INSERT_SIZE;
    this.imuBatchSize = env.IMU_BATCH_INSERT_SIZE;
    this.totalGps = 0;
    this.totalImu = 0;

    this.haversineAccum = createHaversineAccumulator();
    this.maxSpeedTracker = createMaxSpeedTracker();
    this.sprintDetector = createSprintDetector();
    this.playerLoadCalc = createPlayerLoadCalculator();
    this.gpsFilter = createGpsFilter();
    this.gpsInterpolator = createGpsInterpolator();
  }

  async onRecord(record) {
    if (record.type === 'gps') {
      const filtered = this.gpsFilter.processRecord(record);
      if (filtered) {
        const expanded = this.gpsInterpolator.push(filtered);
        for (const fix of expanded) {
          this.haversineAccum.push(fix);
          this.maxSpeedTracker.push(fix);
          this.sprintDetector.push(fix);
        }
      }
      this.gpsBuffer.push(record);
      if (this.gpsBuffer.length >= this.gpsBatchSize) await this._flushGps();
    } else if (record.type === 'imu') {
      this.playerLoadCalc.push(record);
      this.imuBuffer.push(record);
      if (this.imuBuffer.length >= this.imuBatchSize) await this._flushImu();
    }
  }

  async _flushGps() {
    if (!this.gpsBuffer.length) return;
    const inserted = await sessionRepository.insertGpsBatch(
      this.sessionId,
      this.gpsBuffer,
      this.pool
    );
    this.totalGps += inserted;
    this.gpsBuffer = [];
  }

  async _flushImu() {
    if (!this.imuBuffer.length) return;
    const inserted = await sessionRepository.insertImuBatch(
      this.sessionId,
      this.imuBuffer,
      this.pool
    );
    this.totalImu += inserted;
    this.imuBuffer = [];
  }

  async drain() {
    await this._flushGps();
    await this._flushImu();

    const metrics = {
      total_distance_m: this.haversineAccum.getTotal(),
      max_speed_kmh: this.maxSpeedTracker.getMaxKmh(),
      sprint_count: this.sprintDetector.flush(),
      player_load: this.playerLoadCalc.getTotal(),
    };

    return { totalGps: this.totalGps, totalImu: this.totalImu, metrics };
  }
}
