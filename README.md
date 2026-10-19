# Calvin Portfolio

A static site: HTML, CSS and vanilla JavaScript, no build step and no dependencies.
Everything it needs is in this folder, including the fonts, so the page makes no
third-party request at all. That is not incidental tidiness: the page's own live
check reports it, so the claim has to stay true.

```text
portfolio/
├── index.html      all content, readable with JavaScript off
├── styles.css      tokens, layout, the one media query set
├── main.js         enhancements only, each wrapped in feature()
├── vercel.json     security headers and cache rules
├── resume.pdf
├── fonts/          self-hosted woff2, latin subset (see fonts/LICENSE.md)
└── img/
    ├── me.jpg, bisindo.jpg, boardly.jpg, cookierisk.jpg, og-image.png
    └── detail/     crops used in the page and the case studies
```

## Local preview

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory .
```

Open http://127.0.0.1:8765. Check both themes, the three case studies, the
repository links and the résumé before publishing.

## How it is put together

- **Content first.** Every section, including the project summaries and the whole
  record, is written in `index.html`. With JavaScript off the page still reads
  completely; nothing is hidden by a class that only script can remove.
- **`main.js` only adds.** Theme toggle, the live page check, the hero crossfade,
  the work preview and its case-study dialog, entrance reveals. Each sits inside
  `feature()`, so one failure cannot take the page down.
- **The live check** reads `document.cookie`, the Resource Timing API and
  `localStorage` in the visitor's own browser and reports what it finds. Nothing is
  sent anywhere. If a third-party script, font or embed is ever added, that panel
  will say so on the home page, which is the point.
- **Type and colour are tokens** in `:root`, redefined under `html[data-theme=dark]`.
  Five type sizes, three greys, one accent. Adding a sixth size is usually a mistake.

## Content maintenance

- Project rows and their notes live in the `ol#ledger` in `index.html`; the long
  case studies live in the `studies` object in `main.js`. Keep the two in step.
- Cookies Risk Analyzer is a team project; Calvin's role is developer, and the page
  says so. Its score is an aggregate and its checks are heuristic indicators that
  still need a human read.
- BISINDO covers 32 isolated signs. Its documented evaluation does not establish
  performance on unseen signers, so the page does not claim accuracy figures.
- Boardly downloads its hand-landmarker model on first run if it is not cached.
- Keep the site, the résumé and the repository documentation consistent. Add a
  performance claim only with a documented test setup behind it.
- Availability is February 2027; change the résumé and the page together.

## Publishing

Static deployment on Vercel. Framework preset: Other; no build command; output
directory: root.

```bash
npx vercel --prod --yes --scope calvinwuzs-projects
```

`vercel.json` sets the security headers, a strict CSP with no external origins, and
a one-year immutable cache on `fonts/`.
