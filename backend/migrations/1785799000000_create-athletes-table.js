export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('athletes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    position: {
      type: 'varchar(50)',
    },
    birth_date: {
      type: 'date',
    },
    weight_kg: {
      type: 'numeric(5,2)',
    },
    height_m: {
      type: 'numeric(4,3)',
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('athletes');
};
