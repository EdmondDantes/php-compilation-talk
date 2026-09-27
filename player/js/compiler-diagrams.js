/* Source-backed compiler flows, drawn at slide resolution.
 * Runtime platforms are dependencies, not compiler passes. */
(() => {
  'use strict';
  const WIDTH = 1680;
  const HEIGHT = 680;
  const LAST = 6;
  const states = new WeakMap();
  let printing = false;

  const diagrams = {
    typephp: {
      stages: [
        ['PHP-код', '.php + .stub.php', 'код и объявления'],
        ['Разбор', 'nikic/php-parser', 'дерево AST'],
        ['Анализ', 'SSA по AST PHP', 'символы и типы'],
        ['Генерация', 'C++17', 'нативные функции'],
        ['Сборка', 'GCC / Clang', 'объекты и линковка']
      ],
      left: { title: 'Обычная сборка', rows: [['ext', 'Расширение внутри PHP'], ['bin / lib', 'Бинарник или библиотека']], base: 'PHPX + Zend', detail: 'Динамические значения и вызовы' },
      right: { title: 'Nano', tag: 'Linux / macOS', rows: [['--nano', 'Бинарник без Zend VM'], ['Нет', 'eval, include и require']], base: 'PHPX + PHP Nano', detail: 'Ограниченный runtime' },
      takeaway: 'Скомпилированные функции — машинный код. Службы рантайма остаются.'
    },
    elephc: {
      stages: [
        ['PHP-код', '.php + зависимости', 'исходная программа'],
        ['Разбор', 'lexer / parser', 'AST и имена'],
        ['Анализ', 'типы → EIR', 'оптимизация IR'],
        ['Генерация', 'свой backend', 'ARM64 / x86-64'],
        ['Сборка', 'assembler + linker', 'программа + runtime']
      ],
      left: { title: 'Нативная программа', rows: [['Код', 'Из собственного EIR'], ['Runtime', 'Включён при линковке']], base: 'Runtime elephc', detail: 'Строки · массивы · память' },
      right: { title: 'Динамический eval', tag: 'при необходимости', rows: [['Фрагмент', 'Разбор во время работы'], ['Связь', 'Состояние и значения AOT']], base: 'Magician', detail: 'Встроенный интерпретатор' },
      takeaway: 'Основной код — AOT без Zend. Интерпретатор нужен только для части eval.'
    },
    manticore: {
      stages: [
        ['PHP-код', '.php + модули', 'исходная программа'],
        ['Разбор', 'lexer / parser', 'собственное AST'],
        ['Анализ', 'типизированный MIR', 'типы и память'],
        ['Генерация', 'LLVM IR', 'текст для LLVM'],
        ['Сборка', 'clang + cc', 'объекты и линковка']
      ],
      left: { title: 'Нативная программа', rows: [['Код', 'LLVM → машинный код'], ['Runtime', 'Свои службы + библиотеки']], base: 'Без Zend', detail: 'libc · PCRE2 · OpenSSL' },
      right: { title: 'Память определяется в MIR', rows: [['Анализ', 'Escape analysis и эффекты'], ['Вставка', 'retain / release / CoW']], base: 'До LLVM', detail: 'Выбор arena или heap' },
      analysisBranch: true,
      takeaway: 'LLVM получает программу с уже вставленными операциями управления памятью.'
    }
  };


  function render(canvas, step, entering = -1, opacity = 1) {
    if (canvas.dataset.compilerDiagram.startsWith('memory-')) {
      MemoryDiagrams.draw(canvas);
      return;
    }
    const diagram = diagrams[canvas.dataset.compilerDiagram];
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(document.documentElement);
    const color = name => style.getPropertyValue(`--${name}`).trim();
    const mono = style.getPropertyValue('--font-mono').trim();
    const body = style.getPropertyValue('--font-body').trim();
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    function text(value, x, y, size = 28, ink = 'ink', weight = 400, font = body) {
      ctx.fillStyle = color(ink);
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.textBaseline = 'top';
      ctx.fillText(value, x, y);
    }
    function line(points, arrow = false) {
      ctx.strokeStyle = color('accent');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.stroke();
      if (arrow) {
        const [x, y] = points.at(-1);
        const [px, py] = points.at(-2);
        const angle = Math.atan2(y - py, x - px);
        ctx.beginPath();
        ctx.moveTo(x - 9 * Math.cos(angle - .5), y - 9 * Math.sin(angle - .5));
        ctx.lineTo(x, y);
        ctx.lineTo(x - 9 * Math.cos(angle + .5), y - 9 * Math.sin(angle + .5));
        ctx.stroke();
      }
    }
    function panel(x, y, w, h, accent = false) {
      ctx.fillStyle = color('panel');
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color('rule');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + .5, y + .5, w - 1, h - 1, 10);
      ctx.stroke();
      ctx.fillStyle = color(accent ? 'accent' : 'dim');
      ctx.fillRect(x + 20, y, 44, 1.5);
    }
    function reveal(n, draw) {
      if (step < n) return;
      ctx.save();
      if (entering === n) {
        ctx.globalAlpha = opacity;
        ctx.translate(0, (1 - opacity) * 12);
      }
      draw();
      ctx.restore();
    }

    text(canvas.dataset.compilerDiagram === 'typephp' ? '01 / КОМПИЛЯТОР НА PHP → ГЕНЕРАЦИЯ C++' : '01 / КОМПИЛЯЦИЯ', 0, 0, 25, 'accent', 600, mono);
    diagram.stages.forEach(([title, detail, caption], n) => reveal(n, () => {
      const x = n * 342;
      if (n) line([[x - 22, 137], [x - 8, 137]], true);
      panel(x, 57, 312, 172, n === step || step >= 5);
      text(title, x + 20, 78, 36, 'ink', 600);
      text(detail, x + 20, 132, 26, 'accent');
      text(caption, x + 20, 182, 24, 'dim');
    }));

    if (step >= 5) text('02 / АРТЕФАКТ И СРЕДА ИСПОЛНЕНИЯ', 0, 289, 25, 'accent', 600, mono);
    function runtimePanel(n, x, width, data) {
      reveal(n, () => {
        const target = x + (n === 5 ? width - 64 : width / 2);
        if (n === 6 && diagram.analysisBranch) {
          line([[840, 233], [840, 280], [target, 280], [target, 330]], true);
        } else {
          line([[1524, 233], [1524, 254], [target, 254], [target, 330]], true);
        }
        panel(x, 342, width, 250, true);
        text(data.title, x + 24, 362, 34, 'ink', 600);
        if (data.tag) {
          ctx.font = `400 24px ${body}`;
          text(data.tag, x + width - 24 - ctx.measureText(data.tag).width, 370, 24, 'dim');
        }
        data.rows.forEach(([label, detail], i) => {
          text(label, x + 24, 416 + i * 42, 28, 'accent', 600, mono);
          text(detail, x + 220, 416 + i * 42, 28);
        });
        line([[x + 24, 492], [x + width - 24, 492]]);
        text(data.base, x + 24, 510, 29, 'ink', 600);
        text(data.detail, x + 24, 550, 25, 'dim');
      });
    }
    runtimePanel(5, 0, 816, diagram.left);
    runtimePanel(6, 864, 816, diagram.right);
    if (step >= 5) text(diagram.takeaway, 0, 632, 30, 'ink', 500);
    canvas.dataset.renderedStep = String(step);
  }

  function draw(slide, animate = false) {
    const canvas = slide?.querySelector('canvas[data-compiler-diagram]');
    if (!canvas) return;
    const step = printing || slide.dataset.diagramComplete === 'yes'
      ? LAST : Math.min(LAST, Math.max(0, Number(slide.dataset.diagramStep) || 0));
    const old = states.get(canvas);
    if (old?.frame) cancelAnimationFrame(old.frame);
    if (canvas.width !== WIDTH * 2) {
      canvas.width = WIDTH * 2;
      canvas.height = HEIGHT * 2;
    }
    const state = { step, frame: 0 };
    states.set(canvas, state);
    const hint = slide.querySelector('[data-diagram-hint]');
    if (hint) hint.textContent = step < LAST
      ? `Пробел — следующий этап · ${step + 1} / ${LAST + 1}`
      : 'Пробел — следующий слайд';
    if (!animate || !old || step !== old.step + 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(canvas, step);
      return;
    }
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / 260);
      render(canvas, step, step, 1 - (1 - progress) ** 3);
      if (progress < 1) state.frame = requestAnimationFrame(tick);
    }
    state.frame = requestAnimationFrame(tick);
  }

  function repaint() {
    document.querySelectorAll('.compiler-architecture').forEach(slide => draw(slide));
  }
  new MutationObserver(repaint).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  document.fonts.ready.then(repaint);
  addEventListener('beforeprint', () => { printing = true; repaint(); });
  addEventListener('afterprint', () => { printing = false; repaint(); });
  window.CompilerDiagrams = { draw, lastStep: LAST };
})();
