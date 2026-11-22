import type { CardModel } from '../../domain/mappers/cardModel'

/** The card on the Log screen: what to aim for next, in plain data from buildCardModel. */
export function TargetCard({ model }: { model: CardModel }) {
  if (model.kind === 'first') {
    return (
      <section class="card target-card">
        <div class="card-header">
          <span class="status-label muted-label">{model.headerLeft}</span>
          <span class="pill">{model.headerRight}</span>
        </div>
        <div class="card-body center">
          <div class="column">
            <span class="tag">TARGET</span>
            <span class="value primary">{model.targetValue}</span>
          </div>
          <p class="caption">{model.hint}</p>
        </div>
      </section>
    )
  }

  const body = model.body
  return (
    <section class="card target-card">
      <div class="card-header">
        <span class="status-label">{model.headerLeft}</span>
        <span class="chip">{model.headerRight}</span>
      </div>
      <div class="card-body center">
        {body.kind === 'matrix' ? (
          <>
            {body.caption ? <p class="caption">{body.caption}</p> : null}
            <div class="columns" aria-live={model.goalReached ? 'polite' : undefined}>
              {body.columns.map((c) => (
                <div class="column" key={c.label}>
                  {c.primary ? <span class="tag">{c.label}</span> : <span class="small-label">{c.label}</span>}
                  <span class={c.primary ? 'value primary' : 'value'}>{c.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {body.kind === 'repsGoal' ? (
          <>
            <p class="caption">{body.message}</p>
            <div class="column">
              <span class="tag">{body.chipLabel}</span>
              <span class="value primary">{body.value}</span>
            </div>
          </>
        ) : null}
        {body.kind === 'repsTarget' ? (
          <>
            <div class="column">
              <span class="tag">TARGET</span>
              <span class="value primary">{body.target}</span>
            </div>
            <p class="caption">{body.caption}</p>
          </>
        ) : null}
        {body.kind === 'text' ? <p class="body-text">{body.text}</p> : null}
      </div>
    </section>
  )
}
