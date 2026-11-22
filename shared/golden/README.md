# Golden progression scenarios

`progression.json` is the contract between the Android app and the web app (`web/`). It holds 400 seeded
scenarios: the logged sets, the exercise settings and the time, plus the exact output of the real Android
progression engines (target, status, back-off, matrix, texts).

- It is written by `GoldenFixtureTest` (Android unit tests) from the Kotlin engines. Do not edit it by hand.
- A normal Android test run only checks that the file still matches the engines. If you change a rule on
  purpose, regenerate it by running `GoldenFixtureTest` once with the environment variable `GOLDEN_WRITE` set,
  commit the new file, and make the web port match.
- `web/test/progression.parity.test.ts` reads the same file and asserts the TypeScript engines reproduce every
  case.

Weights are multiples of 0.5 and steps are 2, 2.5 or 5, so every number is exact in a 32-bit float and compares
exactly in JavaScript.
