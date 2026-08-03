export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('imu_samples', {
    id: {
      type: 'bigserial',
    },
    session_id: {
      type: 'uuid',
      notNull: true,
      references: '"sessions"',
      onDelete: 'CASCADE',
    },
    time: {
      type: 'timestamptz',
      notNull: true,
    },
    ac_x: {
      type: 'numeric(7,4)',
    },
    ac_y: {
      type: 'numeric(7,4)',
    },
    ac_z: {
      type: 'numeric(7,4)',
    },
    gy_x: {
      type: 'numeric(8,4)',
    },
    gy_y: {
      type: 'numeric(8,4)',
    },
    gy_z: {
      type: 'numeric(8,4)',
    },
  }, {
    constraints: {
      primaryKey: ['id', 'time'],
    }
  });

  pgm.sql(
    `SELECT create_hypertable('imu_samples', 'time', chunk_time_interval => interval '1 day');`
  );

  pgm.createIndex('imu_samples', ['session_id', 'time'], { name: 'idx_imu_session_time', ifNotExists: true });
  pgm.createIndex('gps_samples', ['session_id', 'time'], { name: 'idx_gps_session_time', ifNotExists: true });
};

export const down = (pgm) => {
  pgm.dropIndex('gps_samples', ['session_id', 'time'], { name: 'idx_gps_session_time', ifExists: true });
  pgm.dropTable('imu_samples');
};
