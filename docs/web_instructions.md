# Ferrea web: instructions for AI coding agents

`web/` is a very small Ferrea for a phone browser (built for an iPhone user, installed from Safari with Add to
Home Screen). Read `docs/ai_instructions.md` first: the product rules, tone and progression rules there apply
here unchanged. This file only says what is different.

## What it is, and is not

- Three tabs: Log, History, Backup. No settings, no charts, no stats, no sidebar, no onboarding.
- Fixed "settings": kilograms, the Epley 1RM formula, one step either side in the LIGHTER | TARGET | HEAVIER row.
- Weight and reps exercises, and reps-only exercises. Timed holds are not in the list (no stopwatch); sets of
  timed exercises imported from an Android backup are kept and shown as "45s".
- Everything is stored on the device (IndexedDB). There is no server, no account and no network request after
  the app has loaded. Backup is the only way to move or keep the data.

## Rules that must stay identical to Android

The progression logic in `web/src/domain` is a port of the Kotlin engines. Files mirror the Kotlin names:

| Kotlin | TypeScript |
|---|---|
| `WorkoutEngine.calculateProgressionOfExercise` | `domain/progression/workoutEngine.ts` |
| `SingleMetricEngine` (reps only) | `domain/progression/singleMetricEngine.ts` |
| `BackOff`, `TargetMatrixCalculator`, `StepScale`, `WorkoutMathEngine`, `EngineDefaults` | `backOff.ts`, `targetMatrix.ts`, `stepScale.ts`, `math.ts`, `engineDefaults.ts` |
| `ProgressionCategoryMapper.toDisplayMessage`, `GhisaGrammarFormatter` | `domain/mappers/progressionText.ts`, `domain/formatter/formatter.ts` |
| the decisions in `ExerciseSuggestion.kt` and `SuggestionMatrix.kt` | `domain/mappers/cardModel.ts` |
| `ExerciseSearch` | `domain/search/exerciseSearch.ts` |

- `shared/golden/progression.json` is written by the Android `GoldenFixtureTest` from the real engines.
  `web/test/progression.parity.test.ts` asserts every case. A rule change on Android means: regenerate the
  fixtures (see `shared/golden/README.md`), then fix the web port until the parity test passes.
- Weights are Kotlin floats. The web port rounds with `Math.fround` where Android does float arithmetic.
- Warm-ups are removed before the engines (`progressionFor`), never inside them.
- `domain` has no DOM or storage imports. Storage is `data/`, screens are `features/`, shared bits `ui/`.
- The backup file is the same JSON as the Android backup (kg, `formatVersion` 2, tolerant import).

## Tone and strings

Same tone as Android (section 2 of `docs/ai_instructions.md`): neutral, short, factual, sentence case, no
exclamation marks, no emoji, final periods on supporting text only. The web app speaks Italian (its user is
Italian); exercise names stay in English. Every string lives in `src/domain/i18n/strings.ts`, an English and an
Italian dictionary with `{placeholders}` and plural forms; the English one is the Android wording 1 to 1, and the
parity and card tests switch to it with `setLocale('en')`. Never write a user-facing string inline. Dates use
`it-IT`. Colors are the neutral greyscale in `styles.css`; the only hue is the warm-up orange.

## Exercises

The bundled list (`src/data/defaultExercises.json`) is only the friend's fixed schedule (22 exercises, taken from
Android's defaults by id, plus two web-only ids), not Android's full list. `SEED_VERSION` in `db.ts` is 2: when it
rises, missing ones are added and old numeric-id defaults that are not in the list are removed only if unedited
and without sets. Her own additions (`u...` ids) are never touched.

## Hosting and iOS limits

- It is a static site (`npm run build` gives `web/dist`). Any static host works; it needs HTTPS.
- iOS may clear a website's data after a long time unused. `requestPersistence()` asks the browser to keep it,
  and the Backup tab says what to do. Safari and the installed home-screen app have separate storage, so the
  data lives only where the app was first used; use the icon.
- Timers pause when the app is in the background; the rest timer is computed from the last set's time.
- No haptics, no notifications, no live updates on iOS web.
