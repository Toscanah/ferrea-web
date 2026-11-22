const decimalOrNumeric = (decimal?: boolean): 'decimal' | 'numeric' => (decimal ? 'decimal' : 'numeric')

/** A number field with minus and plus buttons on both sides. The label is a small uppercase caption. */
export function Stepper(props: {
  label: string
  value: string
  placeholder?: string
  decimal?: boolean
  onChange: (value: string) => void
  onMinus: () => void
  onPlus: () => void
  minusDisabled?: boolean
}) {
  return (
    <div class="stepper">
      <div class="stepper-label">{props.label}</div>
      <div class="stepper-row">
        <button class="step-button" aria-label="Decrease" onClick={props.onMinus} disabled={props.minusDisabled}>
          −
        </button>
        <input
          class="step-input"
          type="text"
          inputMode={decimalOrNumeric(props.decimal)}
          value={props.value}
          placeholder={props.placeholder ?? '0'}
          aria-label={props.label}
          onInput={(e) => props.onChange((e.currentTarget as HTMLInputElement).value)}
          onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
        />
        <button class="step-button" aria-label="Increase" onClick={props.onPlus}>
          +
        </button>
      </div>
    </div>
  )
}

/** The same control as one row of a grouped card: the label on the left, minus, value and plus on the right. */
export function FieldRow(props: {
  label: string
  value: string
  placeholder?: string
  decimal?: boolean
  onChange: (value: string) => void
  onMinus: () => void
  onPlus: () => void
  minusDisabled?: boolean
}) {
  return (
    <div class="field-row">
      <span class="field-label">{props.label}</span>
      <div class="field-controls">
        <button class="mini-step" aria-label="Decrease" onClick={props.onMinus} disabled={props.minusDisabled}>
          −
        </button>
        <input
          class="mini-input"
          type="text"
          inputMode={decimalOrNumeric(props.decimal)}
          value={props.value}
          placeholder={props.placeholder ?? '0'}
          aria-label={props.label}
          onInput={(e) => props.onChange((e.currentTarget as HTMLInputElement).value)}
          onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
        />
        <button class="mini-step" aria-label="Increase" onClick={props.onPlus}>
          +
        </button>
      </div>
    </div>
  )
}

/** A row with a label and an on/off switch. */
export function SwitchRow(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label class="field-row">
      <span class="field-label plain">{props.label}</span>
      <input
        class="switch"
        type="checkbox"
        role="switch"
        checked={props.checked}
        onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
      />
    </label>
  )
}
