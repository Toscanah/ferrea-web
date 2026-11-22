// Mirrors com.ghisa.domain.progression.EngineDefaults (only the constants the web app uses).
// Kotlin uses 32-bit floats for weights, so the fractional constants go through Math.fround.
const f = Math.fround

export const SECOND_MS = 1000
export const MINUTE_MS = 60 * SECOND_MS
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

export const EngineDefaults = {
  QUALITY_FLOOR: 3,
  BACK_OFF_FRACTION: f(0.9),
  BACK_OFF_MIN_WEIGHT_FRACTION: f(0.6),
  BACK_OFF_MIN_STEPS: 2,
  LIGHTER_SESSION_DROP: f(0.25),
  LIGHTER_SESSION_WINDOW_MS: 14 * DAY_MS,
  SESSION_THRESHOLD_MS: 4 * HOUR_MS,
  WEIGHT_EPSILON: f(0.001),
  MAX_ESTIMATE_REPS: 36,
  REBASE_AFTER_MISSED_SESSIONS: 3,
  DEFAULT_REPS_CEILING: 20,
} as const

// The settings the Android app lets the user change, fixed here: Epley, one step either side.
export const FIXED_SETTINGS = {
  formula: 'EPLEY',
  matrixSpread: 1,
} as const

export type OneRepMaxFormula = 'EPLEY' | 'BRZYCKI' | 'LANDER'
