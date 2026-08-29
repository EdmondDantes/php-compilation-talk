# PHP: money, governance, and why generics are missing

Collected 2026-08-25 from foundation reports, IRS filings, RFC pages and
core developers' own writing. Figures in USD.

The three sections answer one question the talk needs: **why do changes of
this size not pass in PHP, when they pass elsewhere?**

---

## 1. Money

### PHP Foundation

From the *Impact and Transparency Report 2025*, published 2026-05-27:

| | 2021–22 | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| Donated | 712,484 | 478,767 | 683,550 | 730,534 |
| Fees | 90,273 | 60,098 | 83,110 | 85,343 |
| **Received** | **622,211** | **418,669** | **600,440** | **645,191** |
| **Spent** | **133,285** | **275,181** | **635,487** | **784,376** |

Fees are the 10% Open Source Collective fiscal-host fee plus 1–5%
processing; OSC is still the fiscal host, there is no separate legal
entity. 2025 ran a deliberate deficit of ~$139,000; closing it is a stated
2026 priority.

Paid contributors: 6 in 2022, 6 in 2023, 10 in 2024, **11 contracted in
2025** — Le Blanc, Carlier, Rethans, Banyard, Tovilo, Zelenka, Titcumb,
Watkins, Kocsis, Takamachi, Mathur. Per-developer rates are not
disclosed (unverified).

All-time on Open Collective: $3,359,354.92 raised, $2,529,347.84
disbursed. Sponsor tiers: Platinum $100,000/yr, Gold $24,000, Silver
$12,000. Largest cumulative sponsors: Automattic $762,500, JetBrains
$476,670, Sovereign Tech Fund $214,115, Linux Foundation $183,500.

### The comparison

| | Revenue | Year | Core-language staff |
|---|---|---|---|
| **PHP Foundation** | $645,191 received / $784,376 spent | 2025 | 11 contracted |
| **Python (PSF)** | $4,086,997 | FY2024 | 4 developers-in-residence |
| **Rust Foundation** | $5.1M in / $4.7M out | 2025 | ~6 engineers, $2.0M contributor remuneration |
| **OpenJS** | $2,412,467 | FY2024 | none — covers ~40 projects |
| **Zig (ZSF)** | $670,673 / $520,749 | 2024 | 1 employee + contractors at $60/hr |
| **Go** | — | — | unverified: no foundation, no published headcount |

Also: Microsoft's six-person Faster CPython team was **cancelled
2025-05-15**. Rust Platinum dues rose to $325,000/yr in June 2025.

### Usage share, for the ratio

W3Techs, 2026-08: PHP **70.2%** of server-side languages; Python 1.2%;
JavaScript 7.2%. Stack Overflow 2025 (n=31,771): JavaScript 66%, Python
57.9%, **PHP 18.9%**, Go 16.4%, Rust 14.8%.

Dollars of language funding per point of developer share:

- **PHP ≈ $41k**
- Python ≈ $100k (and most PSF spend is PyPI and PyCon, not CPython)
- **Rust ≈ $318k**

### How to say it on stage

**Do not say** PHP has no funded core development: those 11 contractors
author **42% of php-src commits**, proportionally the most focused spend
of the group.

**Say this instead:** PHP has the smallest budget of any major language
and the largest deployed footprint, and it is the only one of the seven
with **no corporate owner underwriting the language itself**.

---

## 2. Governance

### PHP: a binding vote and no arbiter

The voting RFC (2011, amended 2019-02-22) gives the vote to two classes:
php.net VCS holders who have contributed code, and community
representatives — explicitly "lead developers of PHP based projects".

A language change needs a **two-thirds supermajority**, two weeks of
discussion minimum, two weeks of voting minimum. The old 50%+1 option was
removed by *Abolish Narrow Margins*, accepted 30–2 on 2019-02-22.

RFC index as it stands: 201 implemented, 88 declined, 58 accepted, 26
under discussion. About 30% of concluded RFCs are declined.

**There is no tiebreaker, and the community voted to keep it that way.**
The *PHP Technical Committee* RFC (Zelenka, Garfield) was declined
**10 Yes / 21 No** on 2023-05-12. The Foundation states plainly that the
RFC process is not affiliated with it and that language decisions remain
with the internals community. No evidence of Lerdorf or anyone acting as
arbiter since 2015.

### The others, for contrast

- **Python** — Guido resigned 2018-07-12 over the PEP 572 fight, writing
  "I am not going to appoint a successor." Governance was chosen by a vote
  of 62 of 96 core devs; PEP 8016 won, accepted 2018-12-17. Now a
  five-member Steering Council, at most two per employer.
- **Rust** — RFCs merge by team consent, not a vote. The Leadership
  Council (RFC 3392) merged 2023-06-20.
- **Go** — proposal review meetings escalate on deadlock to three named
  architects (Griesemer, Ian Lance Taylor, Russ Cox) and, if they
  deadlock, to a single named arbiter (Austin Clements). All Google. The
  Go blog: "the Go team makes the final decision."
- **Kotlin** — JetBrains appoints a Lead Language Designer who "is in
  charge of all decisions"; the Language Committee may veto only
  incompatible changes.
- **Swift** — the process document says flatly "open review is not a
  vote"; the chain ends at an Apple-appointed Project Lead.
- **C#** — the Microsoft Language Design Team decides; a proposal moves
  only when an LDT member champions it.

**The structural point:** PHP is the only one of the seven with a binding
public supermajority *and* nobody who can carry a proposal over the line.
An architecture-changing change needs two-thirds of a heterogeneous
electorate, and no arbiter exists.

### The June 2025 AOT thread — sharper than the outline says

Posted 2025-06-16 to php.internals by "wheakerd" (no visible php.net
account). Proposed AST → IR → native via C transpilation or LLVM, a strict
static subset banning `eval` and dynamic includes, and a CLI-first model.

Four replies, all the same day, all negative: Tim Düsterhus (no
implementation plan; cited the abandoned generics RFC as precedent), Larry
Garfield (FrankenPHP worker mode already gives ~80% of it), Rob Landers
(OPcache and preloading cover the startup case), Deleu (the serverless gap
was architectural and political, not about compilation). Then it stopped.

**It never became an RFC at all** — there is no wiki.php.net page in any
state. The `[RFC]` in the subject was the author's own labelling. Slide 35
can be sharpened from "остался обсуждением" to "не дошёл даже до подачи".

---

## 3. Generics — and the wall the whole talk is about

### The record

- `wiki.php.net/rfc/generics` — Scholzen & Schultz, **dated 2016-01-06**,
  still **Draft**, never voted, no patch. Proposed **reified** generics,
  on the argument that erasure "would be inconsistent with the existing
  PHP type system, where any available type-information is always
  available at run-time via reflection".
- `wiki.php.net/rfc/generic-arrays` — Schultz, 2016-02-13, Draft, "no
  patch has been written".
- **One generics RFC has ever reached a vote, and it was the erased one.**
  *Bound-Erased Generic Types* (Seifeddine Gmati), voted 2026-06-14→28:
  **7 Yes / 19 No / 10 Abstain — declined.**

### Nikita Popov's objections, 2020

From his own prototype and the generics-RFC discussion:

- Monomorphisation is out: "In languages like C++, one major advantage of
  monomorphization is that code can be aggressively optimized… the
  optimization potential is many orders of magnitude smaller" in PHP, and
  "copying the entire class including opcodes for each type combination
  would skyrocket memory usage".
- **The opcache objection:** "as the monomorphized class entry would
  depend on runtime state (such as the parent class), it would not be
  possible to place it into opcache SHM. This would only be possible as
  part of preloading… But we can't make preloading a requirement."
- Scale: "php-src has **1500 references to `zend_class_entry`**… a large
  part of these need migration."
- Unsolved: what to do with generic parameter references in opcodes —
  "as opcodes are immutable during inheritance, we cannot shift the
  parameter… I don't have an idea on how to make this really efficient."

### Arnaud Le Blanc's measurement, 2024 — the key finding

Foundation-funded prototype, write-up published 2024-08-19:

- **Baseline overhead is 1–2% against specialised code.** So the per-call
  type check is *not* the blocker.
- The blocker is compound types: unions "can lead to **super-linear time
  complexity** in type checking", and symbolic types are contagious.
- And the root cause, verbatim: type inference is the wall, **"primarily
  due to the very limited view of the codebase the PHP compiler has (it
  only sees one file at a time)"**.

### Why this belongs in the talk's spine

The same wall appears three times, and the talk should name it once and
then point at it:

1. **The JIT on an ordinary `foreach`** — `FE_FETCH_R` is an opaque call,
   and after a foreign call the optimizer must treat everything it knew as
   stale. Local blindness.
2. **The optimizer** — Nikita Popov: only functions returning a constant
   can be inlined, and constants do not propagate across file boundaries.
   File-level blindness.
3. **Generics** — Le Blanc: inference fails because the compiler sees one
   file at a time. The same file-level blindness, in a different feature.

One wall explains why the JIT does not speed up ordinary code, why the
language has no generics, and what every compiler in part 3 is actually
buying. That is stronger as one line than as three observations.

---

## Gaps

- Per-developer pay at the PHP Foundation: not disclosed.
- Per-sponsor annual amounts: only cumulative totals are published.
- Go's language-team headcount and budget: nothing published.
- PHP Foundation 2026 figures: not yet published.
