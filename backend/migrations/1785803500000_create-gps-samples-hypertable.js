export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('gps_samples', {
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
    latitude: {
      type: 'double precision',
    },
    longitude: {
      type: 'double precision',
    },
    speed_ms: {
      type: 'numeric(6,3)',
    },
  }, {
    constraints: {
      primaryKey: ['id', 'time'],
    }
  });

  pgm.sql(
    `SELECT create_hypertable('gps_samples', 'time', chunk_time_interval => interval '1 day');`
  );
};

export const down = (pgm) => {
  pgm.dropTable('gps_samples');
};
