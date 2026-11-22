import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { allExercises, addSet, setsForExercise, setsInRange } from '../../data/repository'
import { useDataVersion } from '../../data/events'
import { buildCardModel, prefillFor } from '../../domain/mappers/cardModel'
import type { Exercise, ExerciseSet, ProgressionState } from '../../domain/model/types'
import { buildLoggedSet, progressionFor, stepScaleFor } from '../../domain/progression/exerciseProgression'
import { EngineDefaults, MINUTE_MS } from '../../domain/progression/engineDefaults'
import { FieldRow, SwitchRow } from '../../ui/stepper'
import { EditSetSheet } from '../history/EditSetSheet'
import { repsMinus, repsPlus, weightMinus, weightPlus } from '../../ui/steppers'
import { showToast } from '../../ui/toast'
import { addDays, formatSetChip, loadPref, parseDecimal, savePref, startOfDay, useNow } from '../../ui/util'
import { ExercisePicker } from './ExercisePicker'
import { TargetCard } from './TargetCard'

const SELECTED_KEY = 'ferrea.selectedExercise'
const REST_WINDOW_MS = 15 * MINUTE_MS

/** The reps target the engine is aiming at for a reps-only exercise. */
function repsOnlyTarget(state: ProgressionState, fallback: number): number {
  const s = state.progressionSuggestion
  if (s.type !== 'SingleMetric') return fallback
  const r = s.reason
  if (r.type === 'Target' || r.type === 'Remaining') return r.target
  if (r.type === 'GoalReached') return r.nextTarget
  if (r.type === 'AtCeiling') return r.ceiling
  return fallback
}

function formatRest(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function LogScreen() {
  const version = useDataVersion()
  const now = useNow(1000)
  const minute = Math.floor(now / MINUTE_MS)

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedId, setSelectedId] = useState(loadPref(SELECTED_KEY) ?? '')
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([])
  const [todaySets, setTodaySets] = useState<ExerciseSet[]>([])
  const [picker, setPicker] = useState(false)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [warmup, setWarmup] = useState(false)
  const [editing, setEditing] = useState<ExerciseSet | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const dayStart = startOfDay(Date.now())
      const [list, mine, today] = await Promise.all([
        allExercises(),
        selectedId ? setsForExercise(selectedId) : Promise.resolve([] as ExerciseSet[]),
        setsInRange(dayStart, addDays(dayStart, 1)),
      ])
      if (cancelled) return
      setExercises(list.filter((e) => !e.isArchived).sort((a, b) => a.name.localeCompare(b.name)))
      setExerciseSets(mine)
      setTodaySets(today)
    })()
    return () => {
      cancelled = true
    }
  }, [version, selectedId])

  const exercise = exercises.find((e) => e.id === selectedId)
  const supported = exercise !== undefined && exercise.progressionMode !== 'TIMED'

  const state = useMemo(
    () => (exercise && supported ? progressionFor(exercise, exerciseSets, Date.now()) : null),
    // minute: a running session ends after four quiet hours, so the target is recomputed as time passes.
    [exercise, supported, exerciseSets, minute],
  )
  const card = useMemo(() => (exercise && state ? buildCardModel(exercise, state) : null), [exercise, state])
  const scale = exercise ? stepScaleFor(exercise) : null
  const usesWeight = exercise?.progressionMode === 'WEIGHT_REPS'

  // Fill the fields from the last set when the exercise or its last set changes, not on every keystroke.
  const prefill = state ? prefillFor(state) : null
  const prefillKey = `${selectedId}|${prefill?.reps}|${prefill?.weight}`
  const applied = useRef('')
  useEffect(() => {
    if (prefill && prefillKey !== applied.current) {
      applied.current = prefillKey
      setReps(prefill.reps)
      setWeight(prefill.weight)
    }
  }, [prefillKey])

  const choose = (e: Exercise) => {
    setSelectedId(e.id)
    savePref(SELECTED_KEY, e.id)
    setWarmup(false)
    setPicker(false)
  }

  const log = async () => {
    if (!exercise || !state) return
    const repsInt = Number.parseInt(reps, 10)
    if (!Number.isFinite(repsInt) || repsInt <= 0) {
      showToast('Enter the reps')
      return
    }
    const weightKg = usesWeight ? parseDecimal(weight) : 0
    if (weightKg === null) {
      showToast('Enter a valid weight')
      return
    }
    const timestamp = Date.now()
    // Same test as the green rows in the Android history: enough reps at the target weight or heavier.
    const initialTarget = state.previousWeight > 0 ? state.previousWeight : state.nextWeight
    const target = usesWeight ? exercise.preferredTargetReps : repsOnlyTarget(state, exercise.preferredTargetReps)
    const reachesTargetWeight =
      !usesWeight || weightKg <= 0 || initialTarget <= 0 || weightKg >= initialTarget - EngineDefaults.WEIGHT_EPSILON
    const cleared = !warmup && target >= 1 && repsInt >= target && reachesTargetWeight

    await addSet(buildLoggedSet(exercise, repsInt, weightKg, timestamp, warmup, exercise.preferredTargetReps, timestamp))
    setWarmup(false)
    if (cleared) showToast('Target cleared')
  }

  // Today's sets of this exercise, newest first, with working sets numbered in the order they were done.
  const dayStart = startOfDay(now)
  const todayMine = exerciseSets.filter((s) => s.timestamp >= dayStart).sort((a, b) => a.timestamp - b.timestamp)
  let workingNumber = 0
  const numbered = todayMine.map((s) => ({ set: s, n: s.isWarmup ? 0 : ++workingNumber }))
  numbered.reverse()

  const latest = todaySets.reduce<ExerciseSet | null>((best, s) => (best === null || s.timestamp > best.timestamp ? s : best), null)
  const restMs = latest ? now - latest.timestamp : -1
  const resting = latest !== null && restMs >= 0 && restMs <= REST_WINDOW_MS

  return (
    <div class="screen log">
      <header class="nav-bar">
        <h1>Log a set</h1>
      </header>

      <button class="selector" onClick={() => setPicker(true)}>
        <span class="selector-name">{exercise ? exercise.name : 'Select an exercise'}</span>
        <span class="chevron">›</span>
      </button>

      {!exercise ? (
        <div class="empty">
          <strong>Pick an exercise</strong>
          <p>Choose one to start logging.</p>
        </div>
      ) : null}

      {exercise && !supported ? <p class="hint">Timed exercises cannot be logged in this version.</p> : null}

      {card ? <TargetCard model={card} /> : null}

      {exercise && supported && state ? (
        <>
          <section class="today-strip" aria-label="Today">
            <div class="today-head">
              <span class="today-title">Today</span>
              {resting && latest ? <span class="rest">Rest {formatRest(restMs)}</span> : null}
            </div>
            {numbered.length > 0 ? (
              <div class="chips-scroll">
                {numbered.map(({ set, n }) => (
                  <button key={set.id} class={set.isWarmup ? 'set-chip warmup' : 'set-chip'} onClick={() => setEditing(set)}>
                    <span class="chip-name">{set.isWarmup ? 'Warm-up' : `Set ${n}`}</span>
                    {formatSetChip(set)}
                  </button>
                ))}
              </div>
            ) : (
              <p class="today-empty">No sets yet.</p>
            )}
          </section>

          <section class="group">
            {usesWeight && scale ? (
              <FieldRow
                label="Weight (kg)"
                decimal
                value={weight}
                onChange={setWeight}
                onMinus={() => setWeight(weightMinus(weight, scale))}
                onPlus={() => setWeight(weightPlus(weight, scale))}
                minusDisabled={weight === ''}
              />
            ) : null}
            <FieldRow
              label="Reps"
              value={reps}
              onChange={(v) => setReps(v.replace(/\D/g, ''))}
              onMinus={() => setReps(repsMinus(reps))}
              onPlus={() => setReps(repsPlus(reps))}
              minusDisabled={reps === ''}
            />
            <SwitchRow label="Warm-up set" checked={warmup} onChange={setWarmup} />
          </section>

          <button class="primary-button big" onClick={() => void log()}>
            {warmup ? 'Log warm-up' : 'Log set'}
          </button>
        </>
      ) : null}

      {picker ? <ExercisePicker exercises={exercises} onPick={choose} onClose={() => setPicker(false)} /> : null}
      {editing && exercise ? <EditSetSheet exercise={exercise} set={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
