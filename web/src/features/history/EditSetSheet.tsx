import { useState } from 'preact/hooks'
import { deleteSets, restoreSets, updateSet } from '../../data/repository'
import type { Exercise, ExerciseSet } from '../../domain/model/types'
import { stepScaleFor } from '../../domain/progression/exerciseProgression'
import { formatWeight } from '../../domain/progression/math'
import { Sheet } from '../../ui/sheet'
import { Stepper } from '../../ui/stepper'
import { repsMinus, repsPlus, weightMinus, weightPlus } from '../../ui/steppers'
import { showToast } from '../../ui/toast'
import { formatClock, parseDecimal } from '../../ui/util'

/** Change the reps, weight or warm-up flag of a logged set, or delete it (with Undo). */
export function EditSetSheet(props: { exercise: Exercise; set: ExerciseSet; onClose: () => void }) {
  const { exercise, set } = props
  const usesWeight = exercise.progressionMode === 'WEIGHT_REPS'
  const scale = stepScaleFor(exercise)

  const [reps, setReps] = useState(String(set.reps))
  const [weight, setWeight] = useState(set.weight > 0 ? formatWeight(set.weight) : '')
  const [warmup, setWarmup] = useState(set.isWarmup)

  const save = async () => {
    const repsInt = Number.parseInt(reps, 10)
    if (!Number.isFinite(repsInt) || repsInt <= 0) {
      showToast('Enter the reps')
      return
    }
    const weightKg = usesWeight ? parseDecimal(weight) : set.weight
    if (weightKg === null) {
      showToast('Enter a valid weight')
      return
    }
    await updateSet({ ...set, reps: repsInt, weight: weightKg, isWarmup: warmup })
    props.onClose()
  }

  const remove = async () => {
    await deleteSets([set.id])
    props.onClose()
    showToast('Set deleted', 'Undo', () => void restoreSets([set]))
  }

  return (
    <Sheet title={exercise.name} onClose={props.onClose}>
      <p class="sub">Logged at {formatClock(set.timestamp)}.</p>
      {usesWeight ? (
        <Stepper
          label="Weight (kg)"
          decimal
          value={weight}
          onChange={setWeight}
          onMinus={() => setWeight(weightMinus(weight, scale))}
          onPlus={() => setWeight(weightPlus(weight, scale))}
          minusDisabled={weight === ''}
        />
      ) : null}
      <Stepper
        label="Reps"
        value={reps}
        onChange={(v) => setReps(v.replace(/\D/g, ''))}
        onMinus={() => setReps(repsMinus(reps))}
        onPlus={() => setReps(repsPlus(reps))}
        minusDisabled={reps === ''}
      />
      <label class="check warm">
        <input type="checkbox" checked={warmup} onChange={(e) => setWarmup((e.currentTarget as HTMLInputElement).checked)} />
        <span>Warm-up set</span>
      </label>
      <button class="primary-button" onClick={() => void save()}>
        Save
      </button>
      <button class="danger-button" onClick={() => void remove()}>
        Delete this set
      </button>
    </Sheet>
  )
}
