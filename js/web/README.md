# RetroPuter fake Web

Extra web pages live here and register themselves:

```js
(window.RETRO_SITES = window.RETRO_SITES || []).push({
  eras: ['1995', '2000'],          // or '*' for every year with a browser
  url: 'http://www.example.com/',  // exact URL, or instead:
  // match: url => url.startsWith('http://www.cyberburbs.com/'),
  page: (url, h) => ({ title: 'Page title', cls: 'w95', blocks: ['<h1>…</h1>', '…'], after(root, nv) {} }),
  search: [{ title: 'Example', url: 'http://www.example.com/', desc: 'Shown in search results', keywords: 'words people might search' }]
});
```

- `blocks` are HTML strings that load one at a time at modem speed. Give images `class="img" data-kb="30"` to make them "weigh" 30 KB and reveal top to bottom.
- `h` has helpers: `h.A(url, text)` for a link, `h.APP(appId, text)` to open a program, `h.esc`, `h.store.get/set` (per year), `h.appLoad(appId, key, default)` to read a program's saved data, `h.param(name)` for URL-hash parameters, `h.search(query)` to get matching `search` entries, `h.era()`, `h.user`, `h.dlTable(files)` + `h.bindDownloads(root)`, `h.gb` guestbook helpers, `h.playMusic(song)`.
- Page styles: reuse the year's classes (`w95`, `w00`, `kev`, `kev95`, `news`, `pix`) or add CSS through a program's `css` field.
- A shared home page opens at `http://www.cyberburbs.com/shared/` with the page data in `h.param('page')`.
- Add a `<script src="js/web/NAME.js"></script>` line to `index.html` before `js/engine.js`.
