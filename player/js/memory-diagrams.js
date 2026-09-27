/* Logical memory schematics: no byte sizes or physical-scale claims.
 * Sources and exclusions: dev/research/compiler-canvas-2026-09.md. */
(() => {
  'use strict';
  function draw(canvas) {
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(document.documentElement);
    const color = name => style.getPropertyValue(`--${name}`).trim();
    const body = style.getPropertyValue('--font-body').trim();
    const mono = style.getPropertyValue('--font-mono').trim();
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 1680, 680);
    function text(value, x, y, size = 26, ink = 'ink', weight = 400, font = body) {
      ctx.fillStyle = color(ink);
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.textBaseline = 'top';
      ctx.fillText(value, x, y);
    }
    function rule(x, y, w, ink = 'rule') {
      ctx.strokeStyle = color(ink); ctx.lineWidth = 1;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
    }
    function box(x, y, title, cells, height = 104) {
      ctx.fillStyle = color('panel');
      ctx.beginPath();ctx.roundRect(x, y, 500, height, 8);ctx.fill();
      ctx.strokeStyle = color('rule');ctx.lineWidth = 1;ctx.stroke();
      text(title,x+18,y+14,25,'accent',500,mono);
      rule(x+18,y+50,464);
      const width=464/cells.length;
      cells.forEach((cell,i)=>{
        if(i){ctx.beginPath();ctx.moveTo(x+18+i*width,y+60);ctx.lineTo(x+18+i*width,y+height-12);ctx.stroke();}
        text(cell,x+28+i*width,y+65,25);
      });
    }
    function arrow(x,y,toY,label='') {
      ctx.strokeStyle=color('accent');ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,toY);ctx.lineTo(x-5,toY-8);
      ctx.moveTo(x,toY);ctx.lineTo(x+5,toY-8);ctx.stroke();
      if(label)text(label,x+18,y+9,24,'dim');
    }
    const kind=canvas.dataset.compilerDiagram.slice(7);
    const titles={value:'01 / ДИНАМИЧЕСКОЕ ЗНАЧЕНИЕ',object:'02 / ОБЪЕКТ',array:'03 / МАССИВ'};
    text(titles[kind],0,0,26,'accent',600,mono);
    const cols=[0,572,1144];
    ['TypePHP · Zend','elephc','Manticore'].forEach((name,i)=>{
      text(name,cols[i],65,34,'ink',600);rule(cols[i],113,536);
    });
    if(kind==='value') {
      box(0,145,'php::Var содержит zval',['тип','данные / адрес']);
      text('int / float / bool — внутри zval.',18,276,26,'dim');
      arrow(250,315,364,'ссылочное значение');
      box(0,386,'Данные по указателю',['строка / массив / объект']);
      text('Zend управляет временем жизни.',18,528,25,'dim');

      box(572,145,'Переменная Mixed',['указатель на ячейку']);
      arrow(822,265,319);
      box(572,341,'Ячейка Mixed в куче',['тег','payload']);
      text('Данные или ссылка на них',590,487,26,'dim');
      text('находятся внутри ячейки.',590,526,26,'dim');

      box(1144,145,'cell',['тег + payload']);
      text('Собственное тегированное значение.',1162,276,25,'dim');
      arrow(1394,315,364,'для ссылочных данных');
      box(1144,386,'Данные по указателю',['строка / массив / объект']);
      text('Это не zval и не ABI Zend.',1162,528,25,'dim');
      text('Универсальное значение нужно для динамики. Известные скаляры могут храниться без него.',0,630,28);
    } else if(kind==='object') {
      box(0,145,'php::Object содержит zval',['IS_OBJECT','указатель']);
      arrow(250,265,315);
      box(0,337,'zend_object',['служебные поля','свойства']);
      text('Объект обслуживают Zend и PHPX.',18,478,25,'dim');
      text('AOT-методы — нативный код.',18,518,26,'dim');

      box(572,145,'Переменная объекта',['указатель']);
      arrow(822,265,315);
      box(572,337,'Объект elephc',['class_id','поле 0','поле 1']);
      text('Поля доступны по смещениям.',590,478,26,'dim');
      text('RC — в заголовке аллокации.',590,518,26,'dim');

      box(1144,145,'Переменная объекта',['указатель']);
      arrow(1394,265,315);
      box(1144,337,'Объект Manticore',['descriptor*','RC','поля']);
      arrow(1210,458,495);
      text('Метаданные класса',1162,518,28,'accent');
      text('методы · тип · освобождение',1162,559,25,'dim');
      text('Общий синтаксис объекта не означает общий формат объекта в памяти.',0,630,28);
    } else {
      box(0,145,'php::Array → zend_array',['HashTable Zend']);
      arrow(250,263,304);
      box(0,323,'Режим packed',['zval','zval','zval']);
      box(0,459,'Режим hash',['Bucket: ключ + zval']);

      box(572,145,'Индексированный массив',['заголовок','элементы']);
      text('Последовательное хранение.',590,274,26,'dim');
      box(572,323,'Ассоциативный массив',['hash header','entries*']);
      arrow(822,439,477);
      text('Ключи, значения и порядок обхода',590,504,25,'dim');
      text('хранят собственные структуры.',590,543,25,'dim');

      box(1144,145,'Единый PhpArray',['режим','RC','длина']);
      arrow(1394,263,304);
      box(1144,323,'Режим PACKED',['v₀','v₁','v₂']);
      box(1144,459,'Режим HASHED',['ключ → значение']);
      text('Режим хранения массива и тип элементов влияют на стоимость доступа.',0,630,28);
    }
    canvas.dataset.renderedStep='0';
  }
  window.MemoryDiagrams={draw};
})();
