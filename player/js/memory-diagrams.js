/* Logical layouts with checked 64-bit sizes, not drawn to byte scale. One grid:
 * equal columns, identical storage rows, centred cells and common baselines. */
(() => {
  'use strict';
  const COLUMN = 528;
  const GAP = 48;
  const PAD = 20;
  const FIRST_ROW = 152;
  const SECOND_ROW = 356;
  const THIRD_ROW = 492;
  const BOX_HEIGHT = 116;
  const layouts = {
    value: {
      title: '01 / ДИНАМИЧЕСКОЕ ЗНАЧЕНИЕ · 64 БИТА',
      columns: [
        { first: ['php::Var / zval', ['payload · 8 Б', 'служебные · 8 Б'], '16 Б'], link: 'для ссылочных значений',
          second: ['Данные Zend в куче', ['строка / массив / объект']],
          notes: ['int, float и bool — внутри zval.', 'Память по ссылке считается отдельно.'] },
        { first: ['Переменная Mixed', ['указатель · 8 Б'], '8 Б'], link: 'адрес универсальной ячейки',
          second: ['Mixed в куче', ['тег · 8 Б', 'payload · 16 Б'], '24 Б'],
          notes: ['Ещё 16 Б — заголовок аллокации.', '8 Б указатель + 40 Б в куче.'] },
        { first: ['cell', ['тег и данные в одном слове'], '8 Б'], link: 'для ссылочных значений',
          second: ['Данные в куче', ['строка / массив / объект']],
          notes: ['8 Б — только само значение cell.', 'Память по ссылке считается отдельно.'] }
      ],
      takeaway: 'Размер значения и память за указателем — разные расходы. Считать нужно оба.'
    },
    object: {
      title: '02 / ОБЫЧНЫЙ ОБЪЕКТ · N ПОЛЕЙ · 64 БИТА',
      columns: [
        { first: ['php::Object / zval', ['IS_OBJECT', 'указатель'], '16 Б'], link: 'адрес объекта',
          second: ['zend_object', ['header · 40 Б', 'поле · 16 Б'], '40 + 16N Б'],
          notes: ['Поле хранится в zval, даже если это int.', 'Метаданные класса — общие.'], metric: '20 млн вызовов: 1178,6 мс' },
        { first: ['Переменная объекта', ['указатель'], '8 Б'], link: 'адрес объекта',
          second: ['Объект elephc', ['class_id · 8 Б', 'поле · 16 Б'], '8 + 16N Б'],
          notes: ['Ещё 16 Б — заголовок аллокации.', 'Слот поля — 16 Б, в том числе для int.'], metric: '20 млн вызовов: 4757,3 мс' },
        { first: ['Переменная объекта', ['указатель'], '8 Б'], link: 'адрес объекта',
          second: ['Объект Manticore', ['descr* · 8 Б', 'RC · 8 Б', 'поле · 8 Б'], '16 + 8N Б'],
          notes: ['Ещё 8 Б — префикс RC-аллокации.', 'Обычные поля — 8 Б, с выравниванием.'], metric: '20 млн вызовов: 64,4 мс' }
      ],
      takeaway: 'PHP JIT: 231,6 мс. В тесте классы без полей: это скорость вызовов, а не проверка плотности.'
    },
    array: {
      title: '03 / МАССИВ · 64 БИТА · FOREACH НА INT',
      columns: [
        { first: ['php::Array → HashTable', ['обёртка · 16 Б', 'header · 56 Б']], link: 'два режима одного контейнера',
          second: ['Плотный режим', ['zval · 16 Б', 'zval · 16 Б'], '16 Б / слот'],
          third: ['Хеш-режим', ['Bucket · 32 Б', '+ хеш-индекс'], '32 Б / запись'], metric: 'foreach: 222,5 мс · native int' },
        { first: ['Array / AssocArray', ['Array · 24 Б', 'Hash · 64 Б']], link: 'заголовки без аллокатора',
          second: ['Индексированный', ['8 Б: int и ссылки', '16 Б: строки'], '8 / 16 Б'],
          third: ['Хеш-таблица', ['entry · 64 Б', 'включая prev/next'], '64 Б / слот'], metric: 'foreach: 650,8 мс' },
        { first: ['PhpArray', ['header · 56 Б', 'RC-префикс · 8 Б']], link: 'два режима одного контейнера',
          second: ['Плотный режим', ['v₀ · 8 Б', 'v₁ · 8 Б'], '8 Б / слот'],
          third: ['Хеш-режим', ['entry · 24 Б', '+ хеш-индекс'], '24 Б / запись'], metric: 'foreach: 12,0 мс' }
      ],
      takeaway: 'PHP JIT: 32 мс · TypePHP + std::vector: 13,2 мс · foreach хеш-массивов не измеряли.'
    }
  };

  function draw(canvas) {
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(document.documentElement);
    const color = name => style.getPropertyValue(`--${name}`).trim();
    const body = style.getPropertyValue('--font-body').trim();
    const mono = style.getPropertyValue('--font-mono').trim();
    const kind = canvas.dataset.compilerDiagram.slice(7);
    const layout = layouts[kind];
    const isArray = kind === 'array';
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 1680, 680);

    function text(value, x, y, size = 25, ink = 'ink', weight = 400, font = body, align = 'left') {
      ctx.fillStyle = color(ink);
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = align;
      ctx.fillText(value, x, y);
      ctx.textAlign = 'left';
    }
    function rule(x, y, width) {
      ctx.strokeStyle = color('rule');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.stroke();
    }
    function box(x, y, [title, cells, bytes], options = {}) {
      const height = options.height || BOX_HEIGHT;
      const compact = options.compact || false;
      ctx.fillStyle = color('panel');
      ctx.strokeStyle = color('rule');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + .5, y + .5, COLUMN - 1, height - 1, 8);
      ctx.fill();
      ctx.stroke();
      text(title, x + PAD, y + (compact ? 14 : 18), 25, 'accent', 500, mono);
      if (bytes) text(bytes, x + COLUMN - PAD, y + (compact ? 14 : 18), 24, 'ink', 600, body, 'right');
      rule(x + PAD, y + (compact ? 46 : 55), COLUMN - 2 * PAD);
      const width = (COLUMN - 2 * PAD) / cells.length;
      cells.forEach((cell, i) => {
        if (i) {
          ctx.beginPath();
          ctx.moveTo(x + PAD + i * width, y + (compact ? 56 : 66));
          ctx.lineTo(x + PAD + i * width, y + (compact ? 89 : height - 14));
          ctx.stroke();
        }
        text(cell, x + PAD + (i + .5) * width, y + (compact ? 62 : 76), 25, 'ink', 400, body, 'center');
      });
      if (options.metric) text(options.metric, x + PAD, y + 104, 24, 'accent', 600);
    }
    text(layout.title, 0, 0, 26, 'accent', 600, mono);
    layout.columns.forEach((column, i) => {
      const x = i * (COLUMN + GAP);
      const center = x + COLUMN / 2;
      text(['TypePHP · Zend', 'elephc', 'Manticore'][i], x + PAD, 72, 34, 'ink', 600);
      rule(x, 122, COLUMN);
      box(x, FIRST_ROW, column.first, isArray ? { height: 100, compact: true } : {});
      text(column.link, center, isArray ? 268 : 284, 24, 'dim', 400, body, 'center');
      ctx.strokeStyle = color('accent');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center, isArray ? 306 : 319);
      ctx.lineTo(center, isArray ? 332 : 342);
      ctx.lineTo(center - 5, isArray ? 324 : 334);
      ctx.moveTo(center, isArray ? 332 : 342);
      ctx.lineTo(center + 5, isArray ? 324 : 334);
      ctx.stroke();
      box(x, isArray ? 348 : SECOND_ROW, column.second, isArray ? { height: 140, compact: true, metric: column.metric } : {});
      if (column.third) box(x, isArray ? 512 : THIRD_ROW, column.third, isArray ? { height: 100, compact: true } : {});
      column.notes?.forEach((line, row) => text(line, x + PAD, 506 + row * 40, 24, 'dim'));
      if (column.metric && !isArray) text(column.metric, x + PAD, 588, 25, 'accent', 500);
    });
    text(layout.takeaway, 0, 638, 27);
    canvas.dataset.renderedStep = '0';
  }
  window.MemoryDiagrams = { draw };
})();
