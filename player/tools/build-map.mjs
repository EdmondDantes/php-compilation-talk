/* Builds inventory.html — the inventory map as one file that opens from disk.
 *
 * The map is a deck slide first (deck/90-inventory.html); this inlines it with
 * the deck's own tokens and layout so the standalone copy cannot drift
 * from what the talk shows. Run after editing the slide:
 *
 *     node tools/build-map.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const slide = read('deck/90-inventory.html')
  .replace(/<!--[\s\S]*?-->/, '')
  .trim();

const page = `<!doctype html>
<html lang="ru" data-theme="terminal">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Кто компилировал PHP — инвентарь</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin" />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600&family=Fira+Sans+Condensed:wght@400;600;700&family=Fira+Sans:wght@400;500&family=Fira+Mono&display=swap" rel="stylesheet" />
<style>
${read('css/theme.css')}
${read('css/slides.css')}

/* Shell of the standalone page: one slide, scaled to the window. */
* { box-sizing: border-box; }

html, body { height: 100%; }

body {
  margin: 0;
  background: var(--bg);
  overflow: hidden;
}

.viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--stage-w);
  height: var(--stage-h);
  transform: translate(-50%, -50%) scale(var(--scale, 1));
}

.theme {
  position: absolute;
  right: 40px;
  bottom: 34px;
  padding: 0;
  background: none;
  border: 0;
  font-family: var(--font-mono);
  font-size: 22px;
  letter-spacing: 0.1em;
  color: var(--faint);
  cursor: pointer;
}

.theme:hover { color: var(--accent); }
</style>
</head>
<body>

<div class="viewport">
  <div class="stage">
${slide}
  </div>
</div>

<button type="button" class="theme">тема</button>

<script>
  'use strict';

  const STAGE_W = 1920;
  const STAGE_H = 1080;
  const THEMES = ['terminal', 'blueprint', 'php'];

  const fit = () => {
    const scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
    document.documentElement.style.setProperty('--scale', String(scale));
  };

  fit();
  addEventListener('resize', fit);

  document.querySelector('.slide').setAttribute('data-current', '');

  /* One chip open at a time; its note goes to the detail line. */
  document.querySelector('.map').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');

    if (!chip) {
      return;
    }

    for (const other of document.querySelectorAll('.chip[data-open]')) {
      other.removeAttribute('data-open');
    }

    chip.setAttribute('data-open', '');

    const detail = document.querySelector('.detail');
    detail.replaceChildren();

    const name = document.createElement('b');
    name.textContent = chip.textContent.trim() + ' — ';
    detail.append(name, chip.dataset.note || '');

    if (chip.dataset.url) {
      const link = document.createElement('a');
      link.href = chip.dataset.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = chip.dataset.url.replace(/^https?:\/\/(www\.)?/, '');
      detail.append(link);
    }
  });

  document.querySelector('.theme').addEventListener('click', () => {
    const now = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = THEMES[(THEMES.indexOf(now) + 1) % THEMES.length];
  });
</script>
</body>
</html>
`;

writeFileSync(join(root, 'inventory.html'), page);
console.log('inventory.html written');
