/* PHP syntax colouring for the deck's code plates.
 *
 * A plate is verbatim source written by hand in the slide markup, sometimes
 * with <span class="out"> or <span class="hi"> already marking a line the
 * speaker points at. Colouring therefore rewrites text nodes only and never
 * touches those spans: the author's own marks outrank the lexer.
 *
 * The lexer is deliberately shallow — one pass, no parser state — because a
 * plate holds a fragment of a few lines rather than a file. Its failure mode
 * is a missed colour, never a mangled listing.
 */

(() => {
  'use strict';

  const KEYWORDS = new Set([
    'abstract', 'and', 'array', 'as', 'bool', 'break', 'callable', 'case', 'catch',
    'class', 'clone', 'const', 'continue', 'declare', 'default', 'do', 'echo',
    'else', 'elseif', 'enum', 'extends', 'false', 'final', 'finally', 'float',
    'fn', 'for', 'foreach', 'function', 'global', 'if', 'implements', 'instanceof',
    'int', 'interface', 'iterable', 'match', 'mixed', 'namespace', 'new', 'null',
    'or', 'parent', 'print', 'private', 'protected', 'public', 'readonly',
    'return', 'self', 'static', 'string', 'switch', 'throw', 'trait', 'true',
    'try', 'use', 'void', 'while', 'yield'
  ]);

  /* One alternative per token kind, in priority order: a comment swallows
     everything to the end of its line, so it has to come before the operators
     that could start inside it. */
  const TOKEN = new RegExp([
    /(?<attr>#\[[^\]\n]*\])/,
    /(?<com>\/\/[^\n]*|#[^\n]*)/,
    /(?<str>'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")/,
    /(?<vari>\$+[A-Za-z_]\w*)/,
    /(?<konst>\b[A-Z_][A-Z0-9_]{2,}\b)/,
    /(?<num>\b\d[\d_]*(?:\.\d+)?\b)/,
    /(?<fn>\b[A-Za-z_]\w*(?=\s*\())/,
    /(?<word>\b[A-Za-z_]\w*\b)/
  ].map((part) => part.source).join('|'), 'g');

  /** Which class paints a match, by the named group that produced it. */
  const CLASS_OF = {
    attr: 'tok-attr',
    com: 'tok-com',
    str: 'tok-str',
    vari: null,
    konst: 'tok-num',
    num: 'tok-num',
    fn: 'tok-fn'
  };

  /**
   * Splits PHP source into coloured spans and bare text.
   *
   * @param {string} source one text node's worth of PHP; any string is valid,
   *   including one that starts or ends mid-statement
   * @returns {DocumentFragment} the same characters, some of them wrapped
   */
  function colour(source) {
    const out = document.createDocumentFragment();
    let plain = 0;

    for (const match of source.matchAll(TOKEN)) {
      const groups = match.groups;
      const kind = Object.keys(groups).find((name) => groups[name] !== undefined);
      /* `foreach (` and `if (` match the call alternative first, so the
         keyword list is consulted for that one too. */
      const name = (kind === 'word' || kind === 'fn') && KEYWORDS.has(match[0])
        ? 'tok-key'
        : (kind === 'word' ? null : CLASS_OF[kind]);

      if (name === null) {
        continue;
      }

      if (match.index > plain) {
        out.append(source.slice(plain, match.index));
      }

      const span = document.createElement('span');
      span.className = name;
      span.textContent = match[0];
      out.append(span);
      plain = match.index + match[0].length;
    }

    if (plain < source.length) {
      out.append(source.slice(plain));
    }

    return out;
  }

  /**
   * Colours every PHP plate under a root, in place.
   *
   * A plate opts in with data-lang="php": the deck also carries C++, shell
   * transcripts and SSA listings, which a PHP lexer would mis-colour. Running
   * twice over the same plate is harmless — text already inside a span is
   * left alone.
   *
   * @param {ParentNode} root
   */
  function highlightPhp(root) {
    for (const plate of root.querySelectorAll('.plate[data-lang="php"]')) {
      const walker = document.createTreeWalker(plate, NodeFilter.SHOW_TEXT);
      const nodes = [];

      while (walker.nextNode()) {
        /* Text the author already marked keeps the mark it was given. */
        if (!walker.currentNode.parentElement.closest('.out, .hi, [class^="tok-"]')) {
          nodes.push(walker.currentNode);
        }
      }

      for (const node of nodes) {
        node.replaceWith(colour(node.nodeValue));
      }
    }
  }

  window.highlightPhp = highlightPhp;
})();
