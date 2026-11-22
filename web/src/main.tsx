import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import { requestPersistence } from './data/repository'
import './styles.css'

render(<App />, document.getElementById('app')!)

// Works offline after the first visit, and picks up a new version the next time the app opens.
registerSW({ immediate: true })
void requestPersistence()
