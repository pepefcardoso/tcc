export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('session_metrics', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    session_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: '"sessions"',
      onDelete: 'CASCADE',
    },
    total_distance_m: {
      type: 'numeric(10,2)',
    },
    max_speed_kmh: {
      type: 'numeric(6,2)',
    },
    sprint_count: {
      type: 'integer',
    },
    player_load: {
      type: 'numeric(10,4)',
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('session_metrics');
};
