# Ferrea web

A minimal Ferrea for a phone browser: Log, History and Backup, with the same progression rules as the Android app. It is a web app that can be added to the iPhone home screen, so it needs no Mac, no Apple developer account and no App Store. Everything is stored on the device.

```
npm install
npm run dev        # local development
npm test           # unit tests, including the parity tests against the Android engines
npm run build      # typecheck and build into dist/
npm run preview    # serve dist/ locally
npm run icons      # rewrite the PNG icons in public/ from the Iron rise glyph
```

How the rules stay identical to Android, the folder layout and the wording rules are in
[`../docs/web_instructions.md`](../docs/web_instructions.md).
