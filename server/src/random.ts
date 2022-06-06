export const dice =
  (min: number, max: number, isRound: boolean = false) =>
  () => {
    const v = Math.random() * (max - min) + min;
    return isRound ? Math.round(v) : v;
  };

export const d2 = dice(1, 2, true);

export const d4 = dice(1, 4, true);

export const d6 = dice(1, 6, true);

export const d8 = dice(1, 8, true);

export const d12 = dice(1, 12, true);

export const d20 = dice(1, 20, true);

export const oneOf = <T>(...values: T[]): T =>
  values[Math.floor(Math.random() * values.length)];
