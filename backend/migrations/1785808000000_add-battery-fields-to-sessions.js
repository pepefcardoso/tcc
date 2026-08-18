export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumns('sessions', {
    battery_pct_start: {
      type: 'smallint',
    },
    battery_pct_end: {
      type: 'smallint',
    },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('sessions', ['battery_pct_start', 'battery_pct_end']);
};
