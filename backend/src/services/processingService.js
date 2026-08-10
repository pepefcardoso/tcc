import { env } from '../config/env.js';
import * as sessionRepository from '../repositories/sessionRepository.js';

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
  }

  async onRecord(record) {
    if (record.type === 'gps') {
      this.gpsBuffer.push(record);
      if (this.gpsBuffer.length >= this.gpsBatchSize) await this._flushGps();
    } else if (record.type === 'imu') {
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
    return { totalGps: this.totalGps, totalImu: this.totalImu };
  }
}
