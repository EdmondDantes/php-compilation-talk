/* Logical layouts, not byte-accurate structs. Every comparison uses one grid:
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
      title: '01 / ДИНАМИЧЕСКОЕ ЗНАЧЕНИЕ',
      columns: [
        { first: ['php::Var / zval', ['тип', 'данные / адрес']], link: 'для ссылочных значений',
          second: ['Данные Zend в куче', ['строка / массив / объект']],
          notes: ['int, float и bool — внутри zval.', 'Время жизни обслуживает Zend.'] },
        { first: ['Переменная Mixed', ['указатель']], link: 'адрес универсальной ячейки',
          second: ['Mixed в куче', ['тег', 'payload']],
          notes: ['Упаковка — отдельная ячейка.', 'Внутри — данные или ссылка.'] },
        { first: ['cell', ['тег', 'payload']], link: 'для ссылочных значений',
          second: ['Собственные данные в куче', ['строка / массив / объект']],
          notes: ['Собственное тегированное значение.', 'Представление не совместимо с zval.'] }
      ],
      takeaway: 'Динамическое значение хранит тип и данные. Известным скалярам универсальная упаковка не нужна.'
    },
    object: {
      title: '02 / ОБЪЕКТ',
      columns: [
        { first: ['php::Object / zval', ['IS_OBJECT', 'указатель']], link: 'адрес объекта',
          second: ['zend_object', ['служебные поля', 'свойства']],
          notes: ['Объектная модель Zend / PHPX.', 'AOT-методы — нативный код.'] },
        { first: ['Переменная объекта', ['указатель']], link: 'адрес объекта',
          second: ['Объект elephc', ['class_id', 'поле 0', 'поле 1']],
          notes: ['Поля — по фиксированным смещениям.', 'RC — в заголовке аллокации.'] },
        { first: ['Переменная объекта', ['указатель']], link: 'адрес объекта',
          second: ['Объект Manticore', ['descriptor*', 'RC', 'поля']],
          notes: ['descriptor* → метаданные класса.', 'RC → счётчик ссылок.'] }
      ],
      takeaway: 'Одинаковый синтаксис объекта — разные структуры и способы управления временем жизни.'
    },
    array: {
      title: '03 / МАССИВ',
      columns: [
        { first: ['php::Array → zend_array', ['HashTable Zend']], link: 'два режима одного контейнера',
          second: ['Плотный режим · packed', ['zval', 'zval', 'zval']],
          third: ['Хешированный режим', ['Bucket: ключ + zval']] },
        { first: ['Array / AssocArray', ['indexed', 'hash']], link: 'два отдельных представления',
          second: ['Индексированный массив', ['header', 'v₀', 'v₁']],
          third: ['Хеш-таблица', ['header', 'entries*']] },
        { first: ['Единый PhpArray', ['режим', 'RC', 'длина']], link: 'два режима одного контейнера',
          second: ['Плотный режим · PACKED', ['v₀', 'v₁', 'v₂']],
          third: ['Хешированный режим', ['ключ → значение']] }
      ],
      takeaway: 'Режим хранения и представление элементов определяют стоимость доступа к массиву.'
    }
  };

  function draw(canvas) {
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(document.documentElement);
    const color = name => style.getPropertyValue(`--${name}`).trim();
    const body = style.getPropertyValue('--font-body').trim();
    const mono = style.getPropertyValue('--font-mono').trim();
    const layout = layouts[canvas.dataset.compilerDiagram.slice(7)];
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
    function box(x, y, [title, cells]) {
      ctx.fillStyle = color('panel');
      ctx.strokeStyle = color('rule');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + .5, y + .5, COLUMN - 1, BOX_HEIGHT - 1, 8);
      ctx.fill();
      ctx.stroke();
      text(title, x + PAD, y + 18, 25, 'accent', 500, mono);
      rule(x + PAD, y + 55, COLUMN - 2 * PAD);
      const width = (COLUMN - 2 * PAD) / cells.length;
      cells.forEach((cell, i) => {
        if (i) {
          ctx.beginPath();
          ctx.moveTo(x + PAD + i * width, y + 66);
          ctx.lineTo(x + PAD + i * width, y + BOX_HEIGHT - 14);
          ctx.stroke();
        }
        text(cell, x + PAD + (i + .5) * width, y + 76, 25, 'ink', 400, body, 'center');
      });
    }
    text(layout.title, 0, 0, 26, 'accent', 600, mono);
    layout.columns.forEach((column, i) => {
      const x = i * (COLUMN + GAP);
      const center = x + COLUMN / 2;
      text(['TypePHP · Zend', 'elephc', 'Manticore'][i], x + PAD, 72, 34, 'ink', 600);
      rule(x, 122, COLUMN);
      box(x, FIRST_ROW, column.first);
      text(column.link, center, 284, 24, 'dim', 400, body, 'center');
      ctx.strokeStyle = color('accent');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center, 319);
      ctx.lineTo(center, 342);
      ctx.lineTo(center - 5, 334);
      ctx.moveTo(center, 342);
      ctx.lineTo(center + 5, 334);
      ctx.stroke();
      box(x, SECOND_ROW, column.second);
      if (column.third) box(x, THIRD_ROW, column.third);
      column.notes?.forEach((line, row) => text(line, x + PAD, 506 + row * 40, 24, 'dim'));
    });
    text(layout.takeaway, 0, 638, 27);
    canvas.dataset.renderedStep = '0';
  }
  window.MemoryDiagrams = { draw };
})();
