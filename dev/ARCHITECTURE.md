# ARCHITECTURE

This repository holds a talk, not a program. The map below says which
part owns what, so an edit lands in one place.

| Part | Responsible for | Knows | Does not know | Depends on |
|---|---|---|---|---|
| `mock/index.html` | Slide content and order of the draft deck | Slide text, speaker notes, which layout class each slide uses | Colors, faces, sizes | `deck.css`, `industry.css`, `deck-stage.js` |
| `mock/css/industry.css` | The design system: color, type and elevation tokens | Palette ramps, font stacks, component looks | Slide layout, slide count | nothing |
| `mock/css/deck.css` | Slide grammar: where things sit on a 1920×1080 field | The grid, the layout classes, type scale of the deck | Which slide uses which layout, what the text says | `industry.css` tokens |
| `mock/js/deck-stage.js` | The stage: scaling, keys, thumbnail rail, notes, print | Slide elements as DOM children | Slide content and styling | nothing |
| `design/*.dc.html` | One design direction each, as artboards | Its own palette, faces and composition | The other directions, the real deck | nothing |
| `design/canvas.json` | Where the artboards sit on the canvas | Positions, titles, notes | Artboard contents | the artboard files |
| `dev/research/` | Verified facts about other projects | Sources and their dates | What goes on a slide | nothing |

Rules that follow from the table:

- A change of look happens in `industry.css`; a change of composition in
  `deck.css`; a change of wording in `index.html`. An edit that has to
  touch all three means the layout class is missing.
- `deck-stage.js` never reads slide content. Anything a slide needs to
  tell the stage travels through a `data-` attribute.
- `design/php-compilation-deck-directions.html` is generated. It appears
  in no table row because it owns nothing.
