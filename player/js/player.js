/* Deck player: scaling, navigation, overview, themes, presenter screen.
 *
 * The deck is plain markup, one file per part under deck/, listed in
 * data-parts on the stage and fetched at load. Fetching is why the deck
 * needs a server rather than a double click on index.html — serve.cmd
 * starts one. The presenter screen is the same document opened in a second
 * window with #presenter in the hash; the two talk over postMessage, with
 * the main window owning the position and the clock.
 */

(() => {
  'use strict';

  const STAGE_W = 1920;
  const STAGE_H = 1080;
  const THEMES = ['terminal', 'blueprint', 'php'];

  /** What each theme is called on the control. */
  const THEME_NAMES = { terminal: 'Терминал', blueprint: 'Чертёж', php: 'Слон' };

  /* Printing forces the paper direction: browsers drop background colours
     by default, and the terminal direction's near-white ink would then
     land on a white page. */
  const PRINT_THEME = 'blueprint';
  const STORE_INDEX = 'deck:index';
  const STORE_THEME = 'deck:theme';

  /** Talk slot in minutes; the presenter timer turns amber past it. */
  const DEFAULT_LIMIT = 45;

  /** Pointer hides after this long without movement, in milliseconds. */
  const IDLE_AFTER = 2500;

  /** How long a typed slide number waits for more digits, in milliseconds. */
  const DIGIT_WINDOW = 900;

  /* The timeline slide's track: these three fix the year-to-pixel scale, so
     its markup carries data-from/data-to in years rather than positions. */
  const TIMELINE_FROM = 2002;
  const TIMELINE_TO = 2026;
  const TIMELINE_TRACK = 1376;

  /**
   * Reads a stored value, tolerating browsers that refuse storage on file://
   * or in private windows.
   *
   * @param {string} key
   * @param {string|null} fallback value returned when nothing is stored
   * @returns {string|null}
   */
  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  /**
   * Stores a value, silently doing nothing where storage is unavailable.
   *
   * @param {string} key
   * @param {string} value
   */
  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* nothing to do: the position is a convenience, not state we own */
    }
  }

  /**
   * Formats a duration as m:ss, or h:mm:ss past an hour.
   *
   * @param {number} ms elapsed milliseconds; negative values clamp to zero
   * @returns {string}
   */
  function duration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const seconds = String(total % 60).padStart(2, '0');
    const minutes = Math.floor(total / 60) % 60;
    const hours = Math.floor(total / 3600);

    if (hours === 0) {
      return `${minutes}:${seconds}`;
    }

    return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  }

  /** Wall clock as HH:MM, for the presenter bar. */
  function clockTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Drives one window of the deck — either the projector view or the
   * presenter view, decided by the hash at load time.
   */
  class DeckPlayer {

    constructor(root) {
      this.root = root;
      this.slides = Array.from(root.querySelectorAll('.slide'));
      this.index = 0;
      this.theme = THEMES.includes(read(STORE_THEME, '')) ? read(STORE_THEME, '') : THEMES[0];
      this.limitMinutes = Number(document.body.dataset.limit || DEFAULT_LIMIT);

      /** Timer start in epoch ms, or null while the talk has not begun. */
      this.startedAt = null;

      /** The other window of the pair, once it is known. */
      this.peer = null;

      /** True in the second window: it renders notes and follows the first. */
      this.isPresenter = location.hash === '#presenter';

      this.digits = '';
      this.digitsTimer = 0;
      this.idleTimer = 0;
      this.overviewBuilt = false;
    }

    /** Wires the document up and shows the first slide. */
    start() {
      this.numberSlides();
      this.applyTheme(this.theme);
      this.fit();

      if (this.isPresenter) {
        document.body.dataset.mode = 'presenter';
        this.peer = window.opener;
        this.buildPresenter();
      } else {
        this.index = this.openingSlide();
      }

      this.buildControl();
      /* The menu is built by now, so the name on it can be filled in. */
      this.applyTheme(this.theme);
      this.buildSlideInteractions();

      /* The presenter window opens on slide one and must not drag the
         projector back there: it follows, it does not lead. */
      this.go(this.index, !this.isPresenter);

      addEventListener('resize', () => this.fit());
      addEventListener('keydown', (event) => this.onKey(event));
      addEventListener('message', (event) => this.onMessage(event));
      addEventListener('mousemove', () => this.wake(), { passive: true });
      addEventListener('beforeunload', () => this.tellPeer({ type: 'bye' }));
      addEventListener('beforeprint', () => {
        document.documentElement.dataset.theme = PRINT_THEME;
      });
      addEventListener('afterprint', () => {
        document.documentElement.dataset.theme = this.theme;
      });

      if (this.isPresenter) {
        setInterval(() => this.paintTimer(), 250);
        this.tellPeer({ type: 'hello' });
      }

      this.wake();
    }

    /** Fills in the running head numbers so markup never carries them by hand. */
    numberSlides() {
      const total = this.slides.length;

      this.slides.forEach((slide, i) => {
        slide.dataset.index = String(i);
        const counter = slide.querySelector('.top .count');

        if (counter) {
          counter.textContent =
            `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        }
      });
    }

    /**
     * Picks the slide to open on: a number in the hash wins, so a link can
     * point at one slide; otherwise the position this browser left off at.
     *
     * @returns {number} slide index
     */
    openingSlide() {
      const asked = Number(location.hash.slice(1));

      if (Number.isInteger(asked) && asked > 0) {
        return this.clamp(asked - 1);
      }

      const stored = Number(read(STORE_INDEX, '0'));
      return Number.isInteger(stored) ? this.clamp(stored) : 0;
    }

    /** @param {number} i @returns {number} i pulled into the deck's range */
    clamp(i) {
      return Math.min(Math.max(i, 0), this.slides.length - 1);
    }

    /** Scales the 1920x1080 stage to the viewport, preserving the aspect. */
    fit() {
      const scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
      const root = document.documentElement;
      root.style.setProperty('--scale', String(scale));

      /* The letterbox around the scaled stage, in screen pixels: the chrome
         hangs off the slide's edge rather than the window's, so it keeps its
         place when the window is a different shape than 16:9. */
      root.style.setProperty('--gutter-x', `${Math.round((innerWidth - STAGE_W * scale) / 2)}px`);
      root.style.setProperty('--gutter-y', `${Math.round((innerHeight - STAGE_H * scale) / 2)}px`);

      if (this.isPresenter) {
        this.fitPresenter();
      }
    }

    /**
     * Shows a slide and tells the peer window about it.
     *
     * @param {number} i slide index; out-of-range values are clamped
     * @param {boolean} [echo] false when the move came from the peer, to
     *   avoid bouncing the same move back
     */
    go(i, echo = true) {
      this.index = this.clamp(i);

      for (const slide of this.slides) {
        slide.toggleAttribute('data-current', Number(slide.dataset.index) === this.index);
      }

      const progress = ((this.index + 1) / this.slides.length) * 100;
      document.documentElement.style.setProperty('--progress', `${progress}%`);

      if (!this.isPresenter) {
        write(STORE_INDEX, String(this.index));
      }

      this.clearDetails();
      this.markOverview();

      if (this.counter) {
        /* Two elements, not one string: the current number is set in the
           accent and the total recedes behind it. */
        this.counter.replaceChildren();
        this.counter.append(String(this.index + 1).padStart(2, '0'));
        const total = document.createElement('span');
        total.className = 'of';
        total.textContent = ` / ${String(this.slides.length).padStart(2, '0')}`;
        this.counter.append(total);
      }

      if (this.script) {
        this.script.textContent = this.slides[this.index].dataset.speakerNotes || '';
      }

      if (this.isPresenter) {
        this.paintPresenter();
      }

      if (echo) {
        this.tellPeer({ type: 'goto', index: this.index });
      }
    }

    /** @param {number} step slides to move by, negative to go back */
    advance(step) {
      this.navigate(this.index + step);
    }

    /**
     * Moves to a slide as a deliberate step, which is what starts the talk
     * clock — restoring the stored position on load must not.
     *
     * @param {number} i slide index; out-of-range values are clamped
     */
    navigate(i) {
      this.startClock();
      this.go(i);
    }

    /**
     * Starts the talk clock on the first move, and only in the projector
     * window: one window owns the time, the other displays it.
     */
    startClock() {
      if (this.isPresenter || this.startedAt !== null) {
        return;
      }

      this.startedAt = Date.now();
      this.tellPeer({ type: 'timer', startedAt: this.startedAt });
    }

    /** @param {string} name one of THEMES */
    applyTheme(name) {
      this.theme = name;
      document.documentElement.dataset.theme = name;
      write(STORE_THEME, name);

      if (this.themeName) {
        this.themeName.textContent = THEME_NAMES[name];
      }

      if (this.themeMenu) {
        for (const item of this.themeMenu.querySelectorAll('.menu button')) {
          item.toggleAttribute('data-on', item.dataset.theme === name);
        }
      }
    }

    /** Switches to the next direction and carries the peer window along. */
    cycleTheme() {
      const next = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length];
      this.applyTheme(next);
      this.tellPeer({ type: 'theme', theme: next });
    }

    /**
     * Flips one of the body flags that gate a layer — overview, help,
     * blackout — in this window only. The layers are per screen: the
     * speaker's overview is not the room's.
     *
     * @param {string} flag dataset name on <body>
     */
    toggle(flag) {
      const on = document.body.dataset[flag] === 'yes';
      document.body.dataset[flag] = on ? 'no' : 'yes';

      if (flag === 'overview' && !on) {
        this.buildOverview();
      }
    }

    /* --- overview ----------------------------------------------------- */

    /** Builds the thumbnail grid once, from clones of the real slides. */
    buildOverview() {
      if (this.overviewBuilt) {
        return;
      }

      const grid = document.querySelector('.overview');

      this.slides.forEach((slide, i) => {
        const tile = document.createElement('figure');
        tile.className = 'thumb';
        tile.dataset.index = String(i);

        const shot = document.createElement('div');
        shot.className = 'shot';
        shot.appendChild(this.cloneSlide(slide));

        const caption = document.createElement('figcaption');
        caption.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span></span>`;
        caption.lastElementChild.textContent = slide.dataset.label || '';

        tile.append(shot, caption);
        tile.addEventListener('click', () => {
          this.navigate(i);
          this.toggle('overview');
        });

        grid.appendChild(tile);
      });

      this.overviewBuilt = true;
      this.fitOverview();
      addEventListener('resize', () => this.fitOverview());
      this.clearDetails();
      this.markOverview();
    }

    /** Scales every thumbnail to its tile width. */
    fitOverview() {
      for (const shot of document.querySelectorAll('.overview .shot')) {
        const scale = shot.clientWidth / STAGE_W;
        shot.style.setProperty('--thumb-scale', String(scale));
        shot.style.height = `${STAGE_H * scale}px`;
      }
    }

    /**
     * Shows the detail a row carries in its .more block, over the list; the
     * same row again closes it.
     *
     * @param {Element} row a list row with a .more block
     */
    expandRow(row) {
      const slide = row.closest('.slide');
      const panel = slide.querySelector('.expand');
      const same = slide.dataset.expanded === row.dataset.more;

      if (same) {
        delete slide.dataset.expanded;
        panel.replaceChildren();
        return;
      }

      slide.dataset.expanded = row.dataset.more;
      panel.replaceChildren(...Array.from(row.querySelector('.more').children, (node) =>
        node.cloneNode(true)));
    }

    /** Drops any selection or filter so a slide is entered at rest. */
    clearDetails() {
      for (const open of this.root.querySelectorAll('[data-open]')) {
        open.removeAttribute('data-open');
      }

      for (const detail of this.root.querySelectorAll('.detail')) {
        detail.replaceChildren();
      }

      for (const slide of this.root.querySelectorAll('.slide[data-expanded]')) {
        delete slide.dataset.expanded;
        slide.querySelector('.expand').replaceChildren();
      }

      for (const timeline of this.root.querySelectorAll('.timeline[data-year]')) {
        delete timeline.dataset.year;

        for (const marked of timeline.querySelectorAll('[data-on], [data-out]')) {
          marked.removeAttribute('data-on');
          marked.removeAttribute('data-out');
        }
      }
    }

    /** Moves the current-slide marker in the overview. */
    markOverview() {
      for (const tile of document.querySelectorAll('.thumb')) {
        tile.toggleAttribute('data-current', Number(tile.dataset.index) === this.index);
      }
    }

    /**
     * Copies a slide for display outside the stage.
     *
     * Clones are inert: the deck has no per-slide scripts, so a copy is
     * indistinguishable from the original once it is scaled.
     *
     * @param {Element} slide
     * @returns {Element}
     */
    cloneSlide(slide) {
      const copy = slide.cloneNode(true);
      copy.removeAttribute('data-current');
      copy.removeAttribute('data-index');
      return copy;
    }

    /* --- presenter ---------------------------------------------------- */

    /** Caches the presenter screen's nodes; markup lives in index.html. */
    buildPresenter() {
      this.ui = {
        now: document.querySelector('.presenter .now .shot'),
        next: document.querySelector('.presenter .next .shot'),
        notes: document.querySelector('.presenter .notes'),
        timer: document.querySelector('.presenter .timer'),
        clock: document.querySelector('.presenter .clock'),
        position: document.querySelector('.presenter .position')
      };
    }

    /** Redraws the current slide, the next one and the speaker's notes. */
    paintPresenter() {
      const current = this.slides[this.index];
      const next = this.slides[this.index + 1] || null;

      this.ui.now.replaceChildren(this.cloneSlide(current));
      this.ui.next.replaceChildren(next ? this.cloneSlide(next) : document.createElement('div'));
      this.ui.notes.textContent = current.dataset.speakerNotes || '';
      this.ui.position.textContent = `${String(this.index + 1).padStart(2, '0')} / `
        + String(this.slides.length).padStart(2, '0');

      this.fitPresenter();
    }

    /** Scales both preview panes to their boxes. */
    fitPresenter() {
      for (const shot of document.querySelectorAll('.presenter .shot')) {
        const scale = shot.clientWidth / STAGE_W;

        for (const slide of shot.children) {
          slide.style.transform = `scale(${scale})`;
        }

        shot.style.height = `${STAGE_H * scale}px`;
      }
    }

    /** Updates the elapsed time and the wall clock; runs on an interval. */
    paintTimer() {
      const elapsed = this.startedAt === null ? 0 : Date.now() - this.startedAt;
      this.ui.timer.textContent = duration(elapsed);
      this.ui.timer.dataset.over = elapsed > this.limitMinutes * 60_000 ? 'yes' : 'no';
      this.ui.clock.textContent = clockTime();
    }

    /** Opens the presenter screen in a second window, or focuses it. */
    openPresenter() {
      if (this.peer && !this.peer.closed) {
        this.peer.focus();
        return;
      }

      this.peer = open(`${location.pathname}#presenter`, 'deck-presenter',
        'width=1280,height=800');
    }

    /* --- messaging ---------------------------------------------------- */

    /**
     * Sends a message to the paired window, if there is one.
     *
     * The origin is '*' on purpose: opened from disk both windows report
     * a null origin, which no explicit target origin can match.
     *
     * @param {object} message
     */
    tellPeer(message) {
      if (this.peer && !this.peer.closed) {
        this.peer.postMessage(message, '*');
      }
    }

    /** @param {MessageEvent} event */
    onMessage(event) {
      const message = event.data;

      if (!message || typeof message !== 'object' || !this.trusts(event)) {
        return;
      }

      /* A reloaded projector window loses its half of the pair; the first
         word from the presenter re-establishes it. */
      if (this.peer === null && event.source) {
        this.peer = event.source;
      }

      /* The first word from the presenter window is how the projector
         window learns where to send its own updates. */
      if (message.type === 'hello') {
        this.peer = event.source;
        this.tellPeer({ type: 'theme', theme: this.theme });
        this.tellPeer({ type: 'timer', startedAt: this.startedAt });
        this.tellPeer({ type: 'goto', index: this.index });
        return;
      }

      if (message.type === 'goto') {
        /* The clock belongs to the projector window even when the move was
           made from the presenter one, so it starts here too. */
        this.startClock();
        this.go(message.index, false);
        return;
      }

      if (message.type === 'theme') {
        this.applyTheme(message.theme);
        return;
      }

      if (message.type === 'timer') {
        this.startedAt = message.startedAt;
        return;
      }

      if (message.type === 'bye') {
        /* The presenter's own opener survives a reload of the projector,
           so it keeps the link the projector has to rebuild. */
        this.peer = this.isPresenter ? window.opener : null;
      }
    }

    /**
     * Decides whether a message may drive this window.
     *
     * Accepted from the paired window, and from an unknown window only
     * while there is no pair yet. Opened from disk both windows report a
     * null origin, so the origin is checked only where there is one.
     *
     * @param {MessageEvent} event
     * @returns {boolean}
     */
    trusts(event) {
      if (event.origin !== 'null' && event.origin !== location.origin) {
        return false;
      }

      return this.peer === null || event.source === this.peer;
    }

    /* --- input -------------------------------------------------------- */

    /** @param {KeyboardEvent} event */
    onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = event.key;

      if (key >= '0' && key <= '9') {
        this.typeDigit(key);
        return;
      }

      const handled = this.command(key);

      if (handled) {
        event.preventDefault();
      }
    }

    /**
     * Runs the action bound to a key.
     *
     * @param {string} key KeyboardEvent.key
     * @returns {boolean} true when the key belonged to the player
     */
    command(key) {
      switch (key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          this.advance(1);
          return true;

        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          this.advance(-1);
          return true;

        case 'Home':
          this.navigate(0);
          return true;

        case 'End':
          this.navigate(this.slides.length - 1);
          return true;

        case 'Enter':
          this.jumpToTyped();
          return true;

        case 'o':
        case 'O':
        case 'Tab':
          this.toggle('overview');
          return true;

        case 't':
        case 'T':
          this.cycleTheme();
          return true;

        case 'p':
        case 'P':
          this.openPresenter();
          return true;

        case 'b':
        case 'B':
          this.toggle('blackout');
          return true;

        case 'f':
        case 'F':
          this.toggleFullscreen();
          return true;

        case 'r':
        case 'R':
          this.resetTimer();
          return true;

        case 'n':
        case 'N':
          this.toggle('script');
          return true;

        case 'h':
        case 'H':
        case '?':
          this.toggle('help');
          return true;

        case 'Escape':
          this.closeLayers();
          return true;

        default:
          return false;
      }
    }

    /** Collects a typed slide number; Enter jumps, silence forgets it. */
    typeDigit(digit) {
      this.digits += digit;
      clearTimeout(this.digitsTimer);
      this.digitsTimer = setTimeout(() => { this.digits = ''; }, DIGIT_WINDOW);
    }

    jumpToTyped() {
      if (this.digits === '') {
        return;
      }

      this.navigate(Number(this.digits) - 1);
      this.digits = '';
    }

    /** Restarts the talk clock from zero and tells the presenter screen. */
    resetTimer() {
      this.startedAt = null;
      this.tellPeer({ type: 'timer', startedAt: null });
    }

    closeLayers() {
      if (this.themeMenu) {
        this.themeMenu.removeAttribute('data-open');
      }

      for (const flag of ['overview', 'help', 'blackout', 'script']) {
        if (document.body.dataset[flag] === 'yes') {
          document.body.dataset[flag] = 'no';
        }
      }
    }

    toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }

      document.documentElement.requestFullscreen().catch(() => {
        /* refused without a user gesture; the key press is one, so this
           only fires where the browser forbids fullscreen outright */
      });
    }

    /**
     * Lets a slide answer a click on its own: a chip or a timeline name
     * writes its note into the slide's detail line, a year on the scale
     * filters the rows. Delegated once, so slides added later need no
     * wiring.
     */
    buildSlideInteractions() {
      this.placeTimelines();

      this.root.addEventListener('click', (event) => {
        const year = event.target.closest('.scale button');

        if (year) {
          this.filterByYear(year);
          return;
        }

        /* The open panel covers the row that opened it, so it has to take
           the closing click itself. */
        const panel = event.target.closest('.expand');

        if (panel && !event.target.closest('a')) {
          const slide = panel.closest('.slide');
          delete slide.dataset.expanded;
          panel.replaceChildren();
          return;
        }

        const row = event.target.closest('.rows li[data-more]');

        if (row) {
          this.expandRow(row);
          return;
        }

        const source = event.target.closest('.chip, .timeline .who');

        if (source) {
          this.openNote(source);
        }
      });
    }

    /**
     * Turns each timeline row's data-from/data-to years into its bar's
     * position and length, so the markup carries dates and never pixels.
     */
    placeTimelines() {
      const perYear = TIMELINE_TRACK / (TIMELINE_TO - TIMELINE_FROM);

      for (const row of this.root.querySelectorAll('.timeline li[data-from]')) {
        const from = Number(row.dataset.from);
        const to = Number(row.dataset.to || TIMELINE_TO);

        row.style.setProperty('--at', String(Math.round((from - TIMELINE_FROM) * perYear)));
        row.style.setProperty('--span', String(Math.round((to - from) * perYear)));
      }
    }

    /**
     * Keeps the projects alive in the clicked year and recedes the rest;
     * the same year again clears the filter.
     *
     * @param {Element} button the year on the scale
     */
    filterByYear(button) {
      const timeline = button.closest('.timeline');
      const year = Number(button.textContent);
      const same = timeline.dataset.year === String(year);

      for (const other of timeline.querySelectorAll('.scale button[data-on]')) {
        other.removeAttribute('data-on');
      }

      if (same) {
        delete timeline.dataset.year;

        for (const row of timeline.querySelectorAll('li[data-out]')) {
          row.removeAttribute('data-out');
        }

        return;
      }

      timeline.dataset.year = String(year);
      button.setAttribute('data-on', '');

      const perYear = TIMELINE_TRACK / (TIMELINE_TO - TIMELINE_FROM);
      timeline.querySelector('.marker').style.left =
        `${Math.round(320 + (year - TIMELINE_FROM) * perYear)}px`;

      for (const row of timeline.querySelectorAll('li[data-from]')) {
        const alive = Number(row.dataset.from) <= year
          && Number(row.dataset.to || TIMELINE_TO) >= year;
        row.toggleAttribute('data-out', !alive);
      }
    }

    /**
     * Writes a clicked element's note into its slide's detail line.
     *
     * @param {Element} source a chip, or a timeline row's name
     */
    openNote(source) {
      const slide = source.closest('.slide');
      const holder = source.closest('.chip, li');
      const detail = slide.querySelector('.detail');

      for (const other of slide.querySelectorAll('[data-open]')) {
        other.removeAttribute('data-open');
      }

      holder.setAttribute('data-open', '');
      detail.replaceChildren();

      const name = document.createElement('b');
      name.textContent = `${source.textContent.trim()} — `;
      detail.append(name, holder.dataset.note || '');

      if (holder.dataset.url) {
        const link = document.createElement('a');
        link.href = holder.dataset.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        /* The scheme and www carry nothing on a slide; the path is the name. */
        link.textContent = holder.dataset.url.replace(/^https?:\/\/(www\.)?/, '');
        detail.append(link);
      }
    }

    /**
     * Wires the theme menu: the button opens it, an item picks a theme, and
     * a click anywhere else closes it.
     */
    buildThemeMenu() {
      const menu = document.querySelector('.themes');
      this.themeName = menu.querySelector('.name');
      this.themeMenu = menu;

      menu.querySelector('.pick').addEventListener('click', (event) => {
        event.stopPropagation();
        const open = menu.hasAttribute('data-open');
        menu.toggleAttribute('data-open', !open);
        menu.querySelector('.pick').setAttribute('aria-expanded', String(!open));
      });

      for (const item of menu.querySelectorAll('.menu button')) {
        item.addEventListener('click', () => {
          this.applyTheme(item.dataset.theme);
          this.tellPeer({ type: 'theme', theme: item.dataset.theme });
          menu.removeAttribute('data-open');
          menu.querySelector('.pick').setAttribute('aria-expanded', 'false');
        });
      }

      addEventListener('click', () => menu.removeAttribute('data-open'));
    }

    /** Wires the on-screen back and forward buttons. */
    buildControl() {
      const control = document.querySelector('.control');

      control.querySelector('.back').addEventListener('click', () => this.advance(-1));
      control.querySelector('.forward').addEventListener('click', () => this.advance(1));
      control.querySelector('.prompter').addEventListener('click', () => this.toggle('script'));
      this.buildThemeMenu();
      this.counter = control.querySelector('.at');
      this.script = document.querySelector('.script p');
    }

    /** Shows the pointer and hides it again once the deck sits still. */
    wake() {
      document.body.dataset.idle = 'no';
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        document.body.dataset.idle = 'yes';
      }, IDLE_AFTER);
    }
  }

  /**
   * Fills the stage with the parts named in its data-parts attribute, in
   * that order.
   *
   * @param {Element} stage
   * @returns {Promise<void>} rejects naming the first part that failed
   */
  async function loadParts(stage) {
    const parts = (stage.dataset.parts || '')
      .split(',')
      .map((path) => path.trim())
      .filter(Boolean);

    /* Fetched together but written in order: a part must not land on the
       stage ahead of an earlier one that was slower to arrive. */
    const markup = await Promise.all(parts.map(async (path) => {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`${path} — ${response.status}`);
      }

      return response.text();
    }));

    stage.insertAdjacentHTML('beforeend', markup.join('\n'));
  }

  /**
   * Replaces the stage with the reason the deck is empty. Opening
   * index.html from disk is the usual one, and it looks like a blank
   * screen unless it says so.
   *
   * @param {Element} stage
   * @param {Error} error
   */
  function reportLoadFailure(stage, error) {
    const local = location.protocol === 'file:';
    const hint = local
      ? 'Плеер открыт с диска, а слайды подгружаются запросом. Запустите serve.cmd в папке player.'
      : `Не удалось загрузить часть: ${error.message}`;

    stage.replaceChildren();
    stage.insertAdjacentHTML('beforeend',
      '<section class="slide statement"><p class="lead">Слайды не загрузились</p>'
      + `<p class="after"></p></section>`);
    stage.querySelector('.after').textContent = hint;
    stage.querySelector('.slide').setAttribute('data-current', '');
  }

  const stage = document.querySelector('.stage');

  loadParts(stage)
    .then(() => new DeckPlayer(stage).start())
    .catch((error) => reportLoadFailure(stage, error));
})();
