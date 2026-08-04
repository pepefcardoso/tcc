export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
    },
    athlete_id: {
      type: 'uuid',
      references: '"athletes"',
      onDelete: 'RESTRICT',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint(
    'users',
    'users_role_check',
    "CHECK (role IN ('tecnico', 'preparador', 'atleta'))"
  );
};

export const down = (pgm) => {
  pgm.dropTable('users');
};
