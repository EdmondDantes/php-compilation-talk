# TypePHP architecture — 2026-09-27

Source review only; no new compilation or benchmark run. Latest published
release and fetched master both resolve to v0.9.3, released September 24,
commit `8b33cad5c4f9cd2be2980425f522496e9ba0bfce`.

- [Release](https://github.com/swoole/typephp/releases/tag/v0.9.3)
- [Pinned source](https://github.com/swoole/typephp/tree/8b33cad5c4f9cd2be2980425f522496e9ba0bfce)

## Diagram evidence

Paths below refer to that commit.

| Diagram element | Source evidence |
| --- | --- |
| PHP and stub input | README.md, compilation flow |
| nikic/php-parser and AST | composer.json; src/CompilerBase.php:796 |
| Prepare symbols, then convert bodies | src/Build/ProjectBuildRunner.php:38; README.md |
| Per-function SSA/e-SSA and type optimization | src/Translator.php:6764 |
| C++17, native compilation, linking | src/Build/ProjectBuildRunner.php:98; README.md requirements |
| ext, bin, lib with PHPX/Zend | README.md modes and native process description |
| Nano without Zend opcode interpreter on Linux/macOS | README.md Nano executable section |

The diagram is a conceptual flow, not a claim that each box is a separate
compiler pass. Function analysis and lowering interact inside conversion.
The runtime platforms under the outputs represent execution dependencies.
Ordinary compiled functions execute as native code; runtime services do not
mean those functions are interpreted as Zend opcodes.

Nano also targets iOS/Android and WASI with platform-specific restrictions.
The slide deliberately shows Linux/macOS only. On Windows, `--nano` still
uses the host backend with php.dll/phpx.dll. A universal statement that
Nano never uses Zend would therefore be incorrect.

WASI output, native C/C++ inputs and build caches are omitted from the
introductory diagram. It is not an exhaustive feature inventory.

The release notes include fixes for dynamic arithmetic result types and
unary-plus conversion. Existing performance slides remain dated 0.9.2
measurements; this source review does not update those results.

## Image provenance

Asset: `player/assets/illustrations/typephp-architecture-0.9.3.png`.
Generated with the built-in image generation tool, without Superdesign.
The diagram labels are raster content; the slide retains an HTML alt text,
speaker explanation and clickable pinned source link.

### Exact generation prompt

Use case: infographic-diagram. Create a polished Russian technical conference infographic image, landscape 16:9, high resolution, flat near-black charcoal #0d0f12 background, restrained amber #ffb000 connectors and off-white labels, muted cool gray secondary labels. Style: premium engineering blueprint matching a dark terminal-themed PHP compiler presentation. No photo, elephant, fantasy, decorative code or logos. Excellent readable typography, crisp thin lines, substantial spacing. All labels large, main labels at least equivalent to 36px on a 1920 canvas, smallest at least 26px. No text outside the specified labels. Leave a clean 100px outer margin.

Top title exactly "Как устроен TypePHP". Small subtitle "0.9.3 · PHP → C++17 → машинный код".

Upper half: horizontal pipeline of five equal nodes with simple technical icons and four unambiguous rightward arrows.
Node 1 title "PHP-код", subtitle ".php + .stub.php"
Node 2 title "Разбор", subtitle "nikic/php-parser → AST"
Node 3 title "Анализ", subtitle "символы · типы · проверки"
Node 4 title "Генерация", subtitle "код C++17"
Node 5 title "Сборка", subtitle "GCC / Clang".

Lower half: from the final Сборка node a clean branching connector goes to two distinct outlined groups.
Larger left group title "Обычная сборка"; inside two simple output cards side by side:
card "ext" subtitle "Расширение PHP"
card "bin / lib" subtitle "Бинарник / библиотека"
Below both cards a shared supporting base labeled "PHPX + Zend" and sublabel "Вызовы и динамические значения".
Smaller right group title "Nano · Linux / macOS"; output card "--nano" subtitle "Бинарник без Zend VM"; supporting base labeled "PHPX + PHP Nano" and sublabel "Ограниченное подмножество PHP".
The runtime bases are dependencies of the respective output cards, NOT extra compiler passes; show as structural platforms underneath.
Bottom takeaway, large and clear: "AOT компилирует функции. Рантайм обслуживает значения и вызовы."
Do not imply all PHP code is accepted, do not show LLVM or direct PHP-to-machine path. Make the flow beautifully balanced, accurate and easy to grasp from a conference audience.
