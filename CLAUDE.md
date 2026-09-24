# RetroPuter

A static site (no build step) that simulates home computers from 1985, 1990, 1995 and 2000. See `js/apps/README.md` for the app plug-in API.

## Rules for every change

- **Keep the Quick Help guide up to date.** Each year shows a first-visit guide (`openHelp()` in `js/engine.js`): what you're looking at, getting around, earning and spending play money, what the computer can do, and going online.
  - Every new app needs a `help: '...'` line (one plain sentence). The guide lists apps from the registry automatically.
  - New shells, money rules, online features or navigation changes need the matching guide page updated by hand.
  - Open `index.html?dev` and check the console: it warns about apps with no help text.
- All ads must look and feel retro (1985 to 2000 style). See `advertise.html`.
- Test with Playwright (global module via `npm root -g`, Chromium at /opt/pw-browsers). Startup takes about 20 seconds by design (`BOOT_PACE`), so allow for it or use `RetroPuter.desk()` with `?dev`.
