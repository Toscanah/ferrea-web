# Ferrea web

A very small Ferrea for a phone browser: Log, History and Backup, with the same progression rules as the Android
app. Add it to the iPhone home screen from Safari; there is no account, no server and no tracking, and everything
is stored on the device.

This repository is generated from the private Ferrea project. Do not edit it by hand: changes are overwritten the
next time it is regenerated.

```
cd web
npm install
npm test        # includes the parity tests against the Android engines (shared/golden)
npm run build
```

See `docs/web_instructions.md` for how the rules are kept identical to the Android app.
