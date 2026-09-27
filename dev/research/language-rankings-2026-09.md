# Language rankings: September 2026 refresh

Checked 2026-09-27. This refresh updates TIOBE in the active deck;
it does not refresh the Stack Overflow or W3Techs figures.

## TIOBE

Primary source: https://www.tiobe.com/tiobe-index/

The official page is headed September 2026. A publication date of
September 27 was not established. The table compares September 2026
with September 2025, not with the previous month.

| Language | September 2026 rank | Rating | September 2025 rank | Year-on-year rating change |
| --- | --- | --- | --- | --- |
| PHP | 14 | 1.04% | 15 | -0.21 percentage points |
| Go | 12 | 1.10% | 8 | -1.22 percentage points |
| Rust | 10 | 1.34% | 18 | +0.33 percentage points |

PHP's prior-year rating was 1.25%, derived from 1.04% + 0.21 points.
Its rank improved while its rating fell. Neither quantity measures the
share of developers, applications, or websites using PHP.

Methodology: https://www.tiobe.com/tiobe-index/programminglanguages_definition/

The calculation counts search-result hits for language-programming queries,
combining multiple search services. It does not count searches made by users.
TIOBE itself says the index does not identify the best language or the
language with the most lines of code.

## Additional material for discussion, not approved narration

RedMonk January 2026, published April 14:
https://redmonk.com/sogrady/2026/04/14/language-rankings-1-26/

- PHP is tied with C# at rank 4; TypeScript is rank 6 and Rust rank 20.
- September TIOBE puts TypeScript at rank 39 and Rust at rank 10.
  These are different methods and observation periods, not competing
  estimates of a single population.
- RedMonk explicitly questions the continued use of Stack Overflow as
  one axis: coding assistants are reducing its representativeness.
- It also reports anomalously low GitHub PR counts. Missing archive data
  and a changing public-code share are hypotheses, not established causes.

Suggested interpretation: AI may change both language use and the public
signals used to measure it. A change in a proxy is insufficient evidence
of a corresponding change in actual adoption.
