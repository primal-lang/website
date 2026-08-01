/*
 * The playground editor: a plain <textarea> with transparent text layered over a
 * highlighted <pre> that carries the colour, plus a line-number gutter.
 *
 * The textarea is the only thing that scrolls or holds a caret, so text input,
 * selection, undo and IME behaviour stay native. The other two layers are
 * decoration and are scrolled to match it.
 *
 * It exposes the slice of the CodeMirror API the playground actually used —
 * getValue, setValue and on('change') — so try.js did not need reworking.
 */

const PRIMAL_EDITOR_INDENT = '    ';

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
  let renderQueued = false;

  function syncScroll() {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
    gutter.scrollTop = input.scrollTop;
  }

  function renderNow() {
    renderQueued = false;

    const value = input.value;
    code.innerHTML = primalRender(value, 'primal');

    const lineCount = value.split('\n').length;
    const numbers = [];

    for (let line = 1; line <= lineCount; line++) {
      numbers.push(line);
    }

    gutter.textContent = numbers.join('\n');
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

  function emitChange() {
    changeListeners.forEach(function (listener) {
      listener();
    });
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

    setValue: function (text) {
      input.value = text;
      render();
      emitChange();
    },

    on: function (event, listener) {
      if (event === 'change') {
        changeListeners.push(listener);
      }
    },

    focus: function () {
      input.focus();
    },
  };
}
