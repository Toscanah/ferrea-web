import { EngineDefaults } from './engineDefaults'
import { f } from './math'

export interface StepTier {
  from: number
  step: number
}

export interface StepScale {
  base: number
  sortedTiers: StepTier[]
}

export function makeStepScale(base: number, tiers: StepTier[] = []): StepScale {
  return { base, sortedTiers: [...tiers].sort((a, b) => a.from - b.from) }
}

function lastTier(scale: StepScale, test: (t: StepTier) => boolean): StepTier | undefined {
  for (let i = scale.sortedTiers.length - 1; i >= 0; i--) if (test(scale.sortedTiers[i])) return scale.sortedTiers[i]
  return undefined
}

export function stepUp(scale: StepScale, w: number): number {
  const tier = lastTier(scale, (t) => t.from <= f(w + EngineDefaults.WEIGHT_EPSILON))
  return tier?.step ?? scale.base
}

export function stepDown(scale: StepScale, w: number): number {
  const tier = lastTier(scale, (t) => t.from < f(w - EngineDefaults.WEIGHT_EPSILON))
  return tier?.step ?? scale.base
}

export function next(scale: StepScale, w: number): number {
  return f(w + stepUp(scale, w))
}

export function previous(scale: StepScale, w: number): number {
  return Math.max(scale.base, f(w - stepDown(scale, w)))
}
