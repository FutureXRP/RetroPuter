# RetroPuter apps

Every program beyond the core desktop lives in its own file here and registers itself:

```js
(window.RETRO_APPS = window.RETRO_APPS || []).push({ ...app });
```

Add a `<script src="js/apps/NAME.js"></script>` line to `index.html` before `js/engine.js`.
`calculator.js` is a small, complete example.

## App fields

| Field | Meaning |
|---|---|
| `id` | Unique, lowercase letters/numbers. Also the storage namespace. |
| `label` | Name on the desktop, in menus and on the title bar. |
| `kind` | `'builtin'` (free, ships with the OS) or `'store'` (bought in the Software Store). |
| `eras` | Builtin only: which years include it, e.g. `['1985', '1995', '2000']`. In `'1985'` there is no windowed desktop: windows fill the screen and should look like an 80-column text-mode program (check `api.era.id === '1985'`). |
| `year` | Store only: release year (1985, 1990, 1995 or 2000). It's sold and runs in that year and every later year. |
| `price`, `publisher`, `genre`, `tagline`, `blurb`, `sizeKB`, `box: { bg, fg, accent }` | Store only: the store listing and box art. `sizeKB` sets install time (floppies, CD or download). |
| `cat` | `'game'` (default) or `'acc'` (accessory). |
| `icon` | Full `<svg viewBox="0 0 32 32">…</svg>` markup, pixel-art style (`shape-rendering="crispEdges"`). |
| `window` | `{ w, h, fixed, autoH }`. On phones, non-fixed windows open maximized. |
| `css` | A CSS string, injected once. Prefix every selector with a class unique to the app. |
| `open(W, api)` | Build the app inside `W.body`. |

## The window `W`

- `W.body`: the element to render into.
- `W.onKey = e => {}`: keydown events while this window is the active one.
- `W.onClose = () => {}`: cleanup (stop timers, animation frames). Set it synchronously inside `open`.
- `W.onMin = () => {}`: the window was minimized (pause games here).
- `W.onResize = () => {}`: the window was resized or maximized.

## The `api`

- `api.era`: `{ id, year }` for the year the computer is running.
- `api.sfx`: `click, key, beep, blip(freq), ding, tada, boom, crash, seek(n), floppy, door, knock, msg, sent`.
- `api.tone(freq, seconds, { type, vol, at, to, decay: 1 })`, `api.noise(seconds, { ft, f, q, vol, at, decay: 1 })`, `api.midi(note)`. Keep `vol` at or below about 0.12.
- `api.playMusic({ mel, bass, step, lead, leadVol, drums: 'four' })` and `api.stopMusic()`. Music stops on its own when the window closes.
- `api.load(key, default)` / `api.save(key, value)`: saved in the browser, private to this app, survives power-off.
- `api.msgBox(title, text, buttons = ['OK'], icon = 'info' | 'warn' | 'stop')` returns a Promise of the clicked label.
- `api.menubar([{ label: 'Game', items: [{ label, fn, disabled }, '-'] }])`.
- `api.setTitle(text)`, `api.close()`.
- `api.earn(dollars, 'reason')`: give the player play money for a win (the engine caps it daily). Use small amounts ($2 to $10).
- `api.online()`, `api.kbps()`: whether the modem is connected, and its speed.
- `api.say(text, { rate, pitch, interrupt })`: read text aloud with the browser's speech voice (for pre-readers). Returns false if unavailable or muted, so always show the text on screen too.
- `api.dial(number, onStatus, profile)`: play a real modem call (`profile` is `'v22'` for 300-2,400 bps). Returns `{ done: Promise<boolean>, cancel() }`. For programs that manage their own connection, like a 1985 terminal.
- `api.user`: the player's user name.
- Helpers: `api.esc`, `api.sleep`, `api.pick`, `api.$`, `api.$$`.

Shared CSS classes you can use: `btn`, `raised`, `sunken`.

## Testing

Open `index.html?dev#1995` and in the console:

```js
RetroPuter.desk();          // skip the boot, go to the desktop
RetroPuter.own('trail');    // pretend it was bought
RetroPuter.launch('trail'); // open it
```
