# Pyhnik 2026 identity

Source: https://pyhnik.phpyh.ru/ (retrieved 2026-09-27).

Original assets, stored locally for presentation playback:

- `logo-full.svg`: https://pyhnik.phpyh.ru/assets/img/logo-full.svg
- `bounded-cyrillic.woff2`: https://pyhnik.phpyh.ru/assets/fonts/bounded-cyrillic.woff2
- `bounded-latin.woff2`: https://pyhnik.phpyh.ru/assets/fonts/bounded-latin.woff2

The logo is used unchanged. Branding belongs to its respective owners.
Palette from the site's `assets/app.css`: navy `#000a2f`, green `#4bfb75`,
white `#ffffff`, warm accent `#ff9f45`.

`player/css/pyhnik.css` selects dedicated navy/green Matrix-inspired versions
for all 12 illustrations in the active deck. Original themes keep their assets.
The title image fades into the exact theme background at its left/top/bottom edges.
Bounded is used for titles; body text and code retain the deck's readable fonts.

## Lighthouse style sample

`lighthouse-cover.png` was produced with the built-in imagegen tool on
2026-09-27, editing `../illustrations/limelight-lighthouse-cover.png`.
This was the initial sample; `lighthouse-cover-matrix.png` is the active cover.

Final generation prompt:

> Use case: style-transfer. Edit target: the supplied lighthouse illustration. Create a polished 16:9 presentation background variant for the Pyhnik PHP conference visual identity. Preserve the lighthouse on the right, rocky shore and sea, its leftward light beam, the scene's narrative and camera composition. Preserve large quiet negative space on the left 60% for white slide text and quiet space at top right for a separately overlaid logo. Change art direction to crisp, elegant, contemporary editorial cinematic illustration with simplified geometric architectural planes and cleaner atmosphere, in deep midnight navy #000a2f and saturated fresh green #4bfb75. The lighthouse emits GREEN light, with controlled green highlights and reflections on blue rocks and water. No yellow or amber light. Deep navy shadows, subtle green atmospheric glow, distinguishable material details without noisy grunge. This should feel designed for a navy and green tech conference, not merely tinted with a filter. Keep the illustration sophisticated and evocative, not cartoonish, not a neon cyberpunk city. Keep left text area DARK NAVY with low contrast detail; beam may glow softly across upper area but should not wash out white title lettering. Do not add text, letters, logos, symbols, watermarks or extra subjects. Output high-quality wide 16:9 bitmap.


## Complete illustration set

Generated using the built-in imagegen tool, with original illustrations as
edit targets and the approved Matrix lighthouse as the style reference.
Exact prompts are recorded in `generation-prompts.json`.
`php-optimizer-detective.png` was generated before its foreach chapter was
removed from the active deck; retained as a reusable asset.

## Conference QR

`conference-qr.svg` encodes exactly `https://pyhnik.phpyh.ru`, with error
correction H and a four-module white quiet zone. The former CSS plate was
removed at the user's request.

The active Pyhnik final scene is `php-ecosystem-migration-qr.png`: a close-up
elephant with a sign physically illustrated on its tail. There is no separate
HTML/CSS sign. The original generated illustration is retained as
`php-ecosystem-migration-painted.png`; its prompt is in `painted-sign-prompt.md`.

The generated QR needed a precise raster correction, explicitly authorized
by the speaker. `../../tools/embed-conference-qr.py` reproduces it using
Python qrcode and Pillow, matching the enamel color and slight perspective
while preserving the painted frame, rope and shadows.

ZXing decoded the final embedded QR from the actual slide screenshot at
1920, 1280 and 960 pixels wide, yielding exactly `https://pyhnik.phpyh.ru`.


## Cinema metaphors

`language-infrastructure-don.png` illustrates the infrastructure slide:
an elephant as Don Corleone weighs a light PHP token against a heavier Laravel
ecosystem. `php-survival-revenant.png` illustrates the renamed PHP survival
slide, with the Revenant protagonist chasing a fleeing elephant. Both were
created with built-in imagegen; exact prompts are recorded in
`don-illustration-prompt.md` and `survival-illustration-prompt.md`.


`php-compilation-detective-grinder.png` replaces the outdoor detective scene
on the compilation-attempts divider. It uses photographic realism: Rust Cohle
in an interview room, beer can, PHP paper entering a grinder and green binary
code leaving it. Generated with built-in imagegen; exact prompt is in
`detective-grinder-prompt.md`. Earlier variants remain available as sources.
