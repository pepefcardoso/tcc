export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    athlete_id: {
      type: 'uuid',
      notNull: true,
      references: '"athletes"',
      onDelete: 'RESTRICT',
    },
    started_at: {
      type: 'timestamptz',
    },
    duration_minutes: {
      type: 'integer',
    },
    pse: {
      type: 'smallint',
    },
    session_load: {
      type: 'numeric(8,2)',
    },
    device_id: {
      type: 'varchar',
    },
    source_filename: {
      type: 'varchar',
      unique: true,
    },
    sync_status: {
      type: 'varchar',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint('sessions', 'sessions_pse_range_check', 'CHECK (pse BETWEEN 1 AND 10)');
};

export const down = (pgm) => {
  pgm.dropTable('sessions');
};
