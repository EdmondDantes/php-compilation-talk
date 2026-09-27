/* Reports every place two pieces of text collide on a slide, leave the
 * 1920x1080 field, or run past the panel, plate or card that holds them.
 *
 * The deck is laid out at fixed pixel offsets, so a change to one offset can
 * push a block onto its neighbour on a slide nobody looked at. Every element
 * that carries text of its own is compared with every other, because the pair
 * that breaks is the pair no one would think to name.
 *
 * Needs a served deck and a Chrome with the DevTools port open:
 *
 *   python3 -m http.server 8000 --directory player
 *   google-chrome --headless=new --remote-debugging-port=9222 \
 *     --window-size=1920,1080 --user-data-dir=/tmp/deck-sweep about:blank
 *   node player/tools/sweep-layout.mjs http://localhost:8000/index.html
 *
 * Exit status is 1 when anything is reported, so a build can gate on it, and 2
 * when the page holds no slides at all.
 */

const DECK = process.argv[2] || 'http://localhost:8000/index.html';
const DEVTOOLS = process.argv[3] || 'http://localhost:9222';

/* The four directions set different faces and heading sizes, so a block that
   fits in one can overrun its neighbour in another. Named on the command line;
   all four by default. */
const THEMES = process.argv[4] ? [process.argv[4]] : ['pyhnik', 'terminal', 'blueprint', 'php'];

/** Smallest intersection, in slide pixels, worth reporting as a collision. */
const TOLERANCE = 2;

/** How long the deck is given to fetch its parts and lay them out, in ms. */
const SETTLE_MS = 3500;

/* A slide is checked in each of the states the room is shown it: at rest,
   with a note pinned into the detail line by a click, and with a row's panel
   open over the list. A pinned note fills the detail line from its top edge,
   which is the space a body above it can be sitting in. */
const STATES = ['rest', 'note', 'expand'];

/** Runs in the page: collects text-bearing elements and compares them. */
const SWEEP = `
((state) => {
  const report = [];

  document.querySelectorAll('.stage .slide').forEach((slide, index) => {
    slide.setAttribute('data-current', '');

    if (state === 'note') {
      const sources = [...slide.querySelectorAll('.chip, .timeline .who')];
      const longest = sources
        .map((el) => [el, (el.closest('.chip, li').dataset.note || '').length])
        .sort((a, b) => b[1] - a[1])[0];

      if (longest && longest[1]) {
        longest[0].click();
      }
    }

    if (state === 'expand') {
      const row = slide.querySelector('.rows li[data-more]');

      if (row) {
        row.click();
      }
    }

    const field = slide.getBoundingClientRect();
    const leaves = [];

    slide.querySelectorAll('*').forEach((element) => {
      const style = getComputedStyle(element);

      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }

      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === 3 && node.nodeValue.trim() !== '').length;

      if (!ownText) {
        return;
      }

      const box = element.getBoundingClientRect();

      if (box.width < 2 || box.height < 2) {
        return;
      }

      leaves.push({
        element,
        box,
        name: element.tagName.toLowerCase() + (element.className ? '.' + element.className : ''),
        text: element.textContent.trim().slice(0, 40)
      });
    });

    /* An open detail panel is opaque and covers the list it was opened from:
       what it hides is hidden on purpose, and only the panel's own text and
       what stays outside it are compared. */
    const panel = slide.querySelector('.expand');
    const covered = slide.dataset.expanded !== undefined
      ? panel.getBoundingClientRect()
      : null;
    const visible = leaves.filter((leaf) => {
      if (!covered || panel.contains(leaf.element)) {
        return true;
      }

      return leaf.box.right <= covered.left || leaf.box.left >= covered.right
        || leaf.box.bottom <= covered.top || leaf.box.top >= covered.bottom;
    });

    const hits = [];

    for (let a = 0; a < visible.length; a++) {
      for (let b = a + 1; b < visible.length; b++) {
        const one = visible[a];
        const other = visible[b];

        if (one.element.contains(other.element) || other.element.contains(one.element)) {
          continue;
        }

        const across = Math.min(one.box.right, other.box.right)
          - Math.max(one.box.left, other.box.left);
        const down = Math.min(one.box.bottom, other.box.bottom)
          - Math.max(one.box.top, other.box.top);

        if (across > ${TOLERANCE} && down > ${TOLERANCE}) {
          hits.push({
            one: one.name, oneText: one.text,
            other: other.name, otherText: other.text,
            across: Math.round(across), down: Math.round(down)
          });
        }
      }
    }

    const escaped = [];

    for (const leaf of visible) {
      const past = Math.round(Math.max(
        field.top - leaf.box.top, leaf.box.bottom - field.bottom,
        field.left - leaf.box.left, leaf.box.right - field.right));

      if (past > ${TOLERANCE}) {
        escaped.push({ name: leaf.name, text: leaf.text, past });
      }
    }

    /* Text that runs past the panel, plate or card it sits in collides with
       nothing when the neighbour is empty space, so the pair test above misses
       it; the frame is the nearest ancestor that draws a box or clips. */
    const framed = (style) => style.overflowX !== 'visible'
      || style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      || style.backgroundImage !== 'none'
      || parseFloat(style.borderRightWidth) > 0;
    const overruns = [];

    for (const leaf of visible) {
      let frame = leaf.element.parentElement;

      while (frame && frame !== slide && !framed(getComputedStyle(frame))) {
        frame = frame.parentElement;
      }

      if (frame && frame !== slide) {
        const edge = frame.getBoundingClientRect();
        /* A frame that scrolls vertically, like the detail panel, holds its tail
           below the fold by design; sideways nobody scrolls during a talk. */
        const scrolls = ['auto', 'scroll'].includes(getComputedStyle(frame).overflowY);
        const below = scrolls ? 0 : leaf.box.bottom - edge.bottom;
        const past = Math.round(Math.max(leaf.box.right - edge.right, below, edge.left - leaf.box.left));

        if (past > ${TOLERANCE}) {
          overruns.push({ name: leaf.name, text: leaf.text, past,
            frame: frame.tagName.toLowerCase() + (frame.className ? '.' + frame.className : '') });
        }
      }

      const clipped = leaf.element.scrollWidth - leaf.element.clientWidth;

      if (getComputedStyle(leaf.element).overflowX !== 'visible' && clipped > ${TOLERANCE}) {
        overruns.push({ name: leaf.name, text: leaf.text, past: clipped, frame: 'its own overflow' });
      }
    }

    if (hits.length || escaped.length || overruns.length) {
      report.push({ slide: index + 1, label: slide.dataset.label || '', hits, escaped, overruns });
    }

    /* Put the slide back: the next state starts from a slide at rest. */
    const detail = slide.querySelector('.detail');

    if (detail) {
      detail.replaceChildren();
    }

    for (const open of slide.querySelectorAll('[data-open]')) {
      open.removeAttribute('data-open');
    }

    if (slide.dataset.expanded !== undefined) {
      delete slide.dataset.expanded;
      slide.querySelector('.expand').replaceChildren();
    }

    slide.removeAttribute('data-current');
  });

  return report;
})
`;

/**
 * Opens a DevTools session on the browser's first page target.
 *
 * @param {string} devtools base URL of the DevTools HTTP endpoint
 * @returns {Promise<{send: (method: string, params?: object) => Promise<object>,
 *   close: () => void}>} rejects when no page target is open
 */
async function connect(devtools) {
  const targets = await (await fetch(`${devtools}/json`)).json();
  const page = targets.find((target) => target.type === 'page');

  if (!page) {
    throw new Error(`no page target at ${devtools}`);
  }

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiting = pending.get(message.id);

    if (!waiting) {
      return;
    }

    pending.delete(message.id);
    message.error ? waiting.reject(new Error(message.error.message)) : waiting.resolve(message.result);
  });

  return {
    send(method, params = {}) {
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => socket.close()
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const session = await connect(DEVTOOLS);
await session.send('Page.enable');
await session.send('Runtime.enable');
await session.send('Network.enable');
await session.send('Network.setCacheDisabled', { cacheDisabled: true });
await session.send('Page.navigate', { url: DECK });
await wait(800);
/* The stylesheets are what a sweep is usually run against, and a warm cache
   serves the previous ones. */
await session.send('Page.reload', { ignoreCache: true });
await wait(SETTLE_MS);

/* A page that is not the deck — a wrong port, a 404, parts that failed to load —
   has no slides, and a sweep over nothing reports clean. Count them first. */
const { result: counted } = await session.send('Runtime.evaluate',
  { expression: "document.querySelectorAll('.stage .slide').length", returnByValue: true });
const slides = counted.value;

if (!slides) {
  console.log(`no slides found at ${DECK}: nothing was checked`);
  session.close();
  process.exit(2);
}

let broken = 0;

for (const theme of THEMES) {
  await session.send('Runtime.evaluate',
    { expression: `document.documentElement.dataset.theme = ${JSON.stringify(theme)}` });
  await wait(400);

  for (const state of STATES) {
  const { result } = await session.send('Runtime.evaluate',
    { expression: `${SWEEP}(${JSON.stringify(state)})`, returnByValue: true });
  const report = result.value;
  broken += report.length;

  for (const slide of report) {
    console.log(`[${theme}/${state}] slide ${slide.slide} — ${slide.label}`);

    for (const hit of slide.hits) {
      console.log(`  collision ${hit.across}x${hit.down}px: `
        + `${hit.one} "${hit.oneText}" over ${hit.other} "${hit.otherText}"`);
    }

    for (const escape of slide.escaped) {
      console.log(`  off the field by ${escape.past}px: ${escape.name} "${escape.text}"`);
    }

    for (const overrun of slide.overruns) {
      console.log(`  past ${overrun.frame} by ${overrun.past}px: ${overrun.name} "${overrun.text}"`);
    }
  }
  }
}

session.close();

console.log(broken === 0
  ? `${slides} slides clean in ${THEMES.join(', ')} at ${STATES.join(', ')}: `
    + 'no collisions, nothing off the field or past its frame'
  : `${broken} slide(s) with problems`);

process.exit(broken === 0 ? 0 : 1);
