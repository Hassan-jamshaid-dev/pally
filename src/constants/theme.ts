export const colors = {
  teal: '#2D5A58',
  tealDark: '#1F4240',
  coral: '#F2967F',
  coralDark: '#B8503A',
  peach: '#FBD9C3',
  peachSoft: '#FDEBDD',
  green: '#A3C59D',
  sage: '#B9CDB0',
  sageDeep: '#8FAE88',
  greenSoft: '#E3EEDF',
  cream: '#FBF4E8',
  card: '#FFFBF4',
  white: '#FFFFFF',
  text: '#1F3534',
  muted: '#52695F',
};

export const contrastColors = {
  ...colors,
  teal: '#0F2B2A',
  tealDark: '#000000',
  coralDark: '#8A2A14',
  cream: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  muted: '#1A1A1A',
  greenSoft: '#EDEDED',
};

export const type = {
  body: 22,
  title: 34,
  hero: 40,
  button: 26,
};

export const TEXT_SCALE = { standard: 1, large: 1.15, xl: 1.3 } as const;

export const MIN_TARGET = 64;
