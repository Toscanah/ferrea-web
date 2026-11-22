import type { ComponentChildren } from 'preact'
import { t } from '../domain/i18n/strings'

/** A bottom sheet over a dimmed screen; tapping the dim area or Close dismisses it. */
export function Sheet(props: { title: string; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="sheet-backdrop" onClick={props.onClose}>
      <div class="sheet" role="dialog" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <div class="grabber" aria-hidden="true" />
        <div class="sheet-header">
          <h2>{props.title}</h2>
          <button class="link-button" onClick={props.onClose}>
            {t('close')}
          </button>
        </div>
        <div class="sheet-body">{props.children}</div>
      </div>
    </div>
  )
}
