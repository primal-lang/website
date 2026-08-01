/*
 * The playground editor: a plain <textarea> with transparent text layered over a
 * highlighted <pre> that carries the colour, plus a line-number gutter.
 *
 * The textarea is the only thing that scrolls or holds a caret, so text input,
 * selection, undo and IME behaviour stay native. The other two layers are
 * decoration and are scrolled to match it.
 *
 * Edits are announced twice: 'change' on every input for listeners cheap enough
 * to run per keystroke, and 'settle' once typing pauses, for anything that is
 * not — compiling the program, above all.
 */

const PRIMAL_EDITOR_INDENT = '    ';

// Long enough that a normal typing run produces one 'settle', short enough that
// a deliberate pause does not feel like waiting.
const PRIMAL_EDITOR_SETTLE_DELAY = 200;

function createPrimalEditor(container, options) {
  const settings = options || {};

  const gutter = document.createElement('div');
  gutter.className = 'editor-gutter';
  gutter.setAttribute('aria-hidden', 'true');

  const surface = document.createElement('div');
  surface.className = 'editor-surface';

  const highlight = document.createElement('pre');
  highlight.className = 'editor-highlight';
  highlight.setAttribute('aria-hidden', 'true');

  const code = document.createElement('code');
  highlight.appendChild(code);

  const input = document.createElement('textarea');
  input.className = 'editor-input';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('aria-label', settings.label || 'Source code');
  input.value = settings.value || '';

  surface.appendChild(highlight);
  surface.appendChild(input);
  container.classList.add('editor');
  container.appendChild(gutter);
  container.appendChild(surface);

  const changeListeners = [];
  const settleListeners = [];
  let renderQueued = false;
  let settleTimer = null;
  let errorMark = null;

  function syncScroll() {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
    gutter.scrollTop = input.scrollTop;
  }

  function renderNow() {
    renderQueued = false;

    const value = input.value;
    code.innerHTML = primalRender(value, 'primal', { error: errorMark });

    const lineCount = value.split('\n').length;
    const errorRow = errorMark !== null ? errorMark.row : 0;
    const lines = [];

    // One element per line rather than one text node, so the line an error was
    // reported on can carry a marker without disturbing the others.
    for (let line = 1; line <= lineCount; line++) {
      const marker = line === errorRow ? ' editor-gutter-error' : '';
      lines.push('<div class="editor-gutter-line' + marker + '">' + line + '</div>');
    }

    gutter.innerHTML = lines.join('');
    syncScroll();
  }

  // Keystrokes arrive faster than the browser paints, so renders are coalesced
  // to one per frame. The textarea itself always holds the current text, so
  // getValue never waits for a render.
  function render() {
    if (renderQueued) {
      return;
    }

    renderQueued = true;
    requestAnimationFrame(renderNow);
  }

  function cancelSettle() {
    if (settleTimer !== null) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  }

  function emitSettle() {
    settleTimer = null;

    settleListeners.forEach(function (listener) {
      listener();
    });
  }

  function emitChange() {
    changeListeners.forEach(function (listener) {
      listener();
    });

    // Restarted by every keystroke, so 'settle' fires once after a typing run
    // rather than once per character.
    cancelSettle();
    settleTimer = setTimeout(emitSettle, PRIMAL_EDITOR_SETTLE_DELAY);
  }

  // insertText keeps the browser's own undo stack intact; assigning to .value
  // would clear it and make Ctrl+Z do nothing. It also raises an input event of
  // its own, so callers must not render or notify again — returning true says
  // the edit has already been announced.
  function replaceSelection(text) {
    let inserted = false;

    try {
      inserted = document.execCommand('insertText', false, text);
    } catch (error) {
      inserted = false;
    }

    if (inserted) {
      return true;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    input.selectionStart = start + text.length;
    input.selectionEnd = input.selectionStart;

    return false;
  }

  function shiftLines(dedent) {
    const value = input.value;
    const from = value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    const newline = value.indexOf('\n', input.selectionEnd);
    const to = newline === -1 ? value.length : newline;

    const shifted = value
      .slice(from, to)
      .split('\n')
      .map(function (line) {
        if (!dedent) {
          return PRIMAL_EDITOR_INDENT + line;
        }

        const leading = line.match(/^ {1,4}/);

        return leading ? line.slice(leading[0].length) : line;
      })
      .join('\n');

    input.setSelectionRange(from, to);
    const announced = replaceSelection(shifted);
    input.setSelectionRange(from, from + shifted.length);

    return announced;
  }

  input.addEventListener('input', function () {
    render();
    emitChange();
  });

  input.addEventListener('scroll', syncScroll);

  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    event.preventDefault();

    let announced;

    if (event.shiftKey) {
      announced = shiftLines(true);
    } else if (input.selectionStart === input.selectionEnd) {
      announced = replaceSelection(PRIMAL_EDITOR_INDENT);
    } else {
      announced = shiftLines(false);
    }

    // Only when the fallback path ran, since insertText already raised input.
    if (!announced) {
      render();
      emitChange();
    }
  });

  renderNow();

  return {
    getValue: function () {
      return input.value;
    },

    // A silent setValue announces nothing: callers replacing the whole program
    // compile it themselves, and a settle still pending from earlier typing
    // belongs to text that no longer exists either way.
    setValue: function (text, options) {
      input.value = text;
      render();
      cancelSettle();

      if (!options || !options.silent) {
        emitChange();
      }
    },

    // Errors are held as the compiler reports them — a 1-based row and column —
    // and resolved to a token on every render, so the marker tracks the text
    // instead of going stale against a saved offset. Passing null clears it.
    setError: function (mark) {
      errorMark = mark || null;
      render();
    },

    on: function (event, listener) {
      if (event === 'change') {
        changeListeners.push(listener);
      } else if (event === 'settle') {
        settleListeners.push(listener);
      }
    },

    focus: function () {
      input.focus();
    },
  };
}
