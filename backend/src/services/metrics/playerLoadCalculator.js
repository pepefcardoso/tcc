import { createTriAxisButterworthFilter, BUTTERWORTH_SAMPLE_RATE_HZ } from './butterworthFilter.js';

export const PLAYER_LOAD_SAMPLE_RATE_HZ = BUTTERWORTH_SAMPLE_RATE_HZ;

export function createPlayerLoadCalculator() {
  let prevFiltered = null;
  let totalPlayerLoad = 0;
  const triFilter = createTriAxisButterworthFilter();

  function isValidRecord(record) {
    if (!record) return false;
    if (typeof record.ac_x !== 'number' || !isFinite(record.ac_x)) return false;
    if (typeof record.ac_y !== 'number' || !isFinite(record.ac_y)) return false;
    if (typeof record.ac_z !== 'number' || !isFinite(record.ac_z)) return false;
    return true;
  }

  return {
    push(imuRecord) {
      if (!isValidRecord(imuRecord)) {
        return totalPlayerLoad;
      }

      const currentFiltered = triFilter.push(imuRecord);

      if (
        Number.isNaN(currentFiltered.ac_x_f) ||
        Number.isNaN(currentFiltered.ac_y_f) ||
        Number.isNaN(currentFiltered.ac_z_f)
      ) {
        return totalPlayerLoad;
      }

      if (prevFiltered === null) {
        prevFiltered = currentFiltered;
        return totalPlayerLoad;
      }

      const dx = currentFiltered.ac_x_f - prevFiltered.ac_x_f;
      const dy = currentFiltered.ac_y_f - prevFiltered.ac_y_f;
      const dz = currentFiltered.ac_z_f - prevFiltered.ac_z_f;

      const plInst = Math.sqrt(dx * dx + dy * dy + dz * dz) / PLAYER_LOAD_SAMPLE_RATE_HZ;

      totalPlayerLoad += plInst;
      prevFiltered = currentFiltered;

      return totalPlayerLoad;
    },

    getTotal() {
      return totalPlayerLoad;
    },

    reset() {
      totalPlayerLoad = 0;
      prevFiltered = null;
      triFilter.reset();
    },
  };
}
