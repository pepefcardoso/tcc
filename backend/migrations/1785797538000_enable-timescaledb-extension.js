export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
};

export const down = (pgm) => {
  pgm.sql('DROP EXTENSION IF EXISTS timescaledb CASCADE;');
};
