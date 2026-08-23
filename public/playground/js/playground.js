const SAMPLES = {
  'default': `/*
  Input: a positive number
  Output: true if the number is bigger than 10, false otherwise
*/

isBiggerThan10(n) = n > 10

main() = isBiggerThan10(7)`,
}

getSample('samples/balanced_parentheses.prm', 'balancedParentheses')
getSample('samples/binary_search.prm', 'binarySearch')
getSample('samples/divisors.prm', 'divisors')
getSample('samples/factorial.prm', 'factorial')
getSample('samples/fibonacci.prm', 'fibonacci')
getSample('samples/find_max.prm', 'findMax')
getSample('samples/flatten.prm', 'flatten')
getSample('samples/frequency.prm', 'frequency')
getSample('samples/gcd_lcm.prm', 'gcdLcm')
getSample('samples/matrix_multiply.prm', 'matrixMultiply')
getSample('samples/moving_averages.prm', 'movingAverages')
getSample('samples/is_palindrome.prm', 'isPalindrome')
getSample('samples/pi_estimate.prm', 'piEstimate')
getSample('samples/power.prm', 'power')
getSample('samples/is_prime.prm', 'isPrime')
getSample('samples/quicksort.prm', 'quicksort')
getSample('samples/reverse_list.prm', 'reverseList')
getSample('samples/to_roman_numerals.prm', 'romanNumerals')
getSample('samples/sum_of_digits.prm', 'sumOfDigits')
getSample('samples/to_binary.prm', 'toBinary')

// A corrupt entry must not take the whole playground down, so an unreadable
// history is simply treated as an empty one.
function readConsoleHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem('consoleHistory'))

    return Array.isArray(stored) ? stored : []
  } catch (e) {
    return []
  }
}

const INPUTS = readConsoleHistory()
let inputIndex = (INPUTS.length > 0) ? INPUTS.length : -1

// The compiler holds every compiled program in a registry keyed by an id, so an
// id has to be released once nothing refers to it. The last program to compile
// is deliberately kept alive for the console to evaluate against, which makes
// releasing the one it replaces this module's job. Ids start at 0, which is why
// the guards below check against null instead of relying on truthiness.
let compiledCode = null
let compiledSource = null

function releaseCompiledCode() {
  if (compiledCode !== null) {
    disposeCode(compiledCode)
  }

  compiledCode = null
  compiledSource = null
}

// A compiler error carries no structured position: the location is interpolated
// into the message text, and only by some error classes. So this is best effort
// — a message without one, which is every semantic error including the undefined
// identifier, still reports in the console with nothing to point at.
const ERROR_LOCATION = /\bat \[(\d+), (\d+)\]/

function errorLocation(error) {
  const match = ERROR_LOCATION.exec(String(error))

  return match ? { row: Number(match[1]), column: Number(match[2]) } : null
}

function compileCode(sourceCode) {
  const consoleInput = document.getElementById('consoleInput')
  let intermediateCode = null

  releaseCompiledCode()

  try {
    intermediateCode = sourceCode ? compileInput(sourceCode) : intermediateRepresentationEmpty()
    const warnings = runtimeWarnings(intermediateCode)

    for (const warning of warnings) {
      writeOutputWarning(warning)
    }

    if (runtimeHasMain(intermediateCode)) {
      const result = runtimeExecuteMain(intermediateCode)
      writeOutputSuccess(result)
    }

    localStorage.setItem('sourceCode', sourceCode)

    // Ownership passes to the cache, so the release below must not take it back.
    compiledCode = intermediateCode
    compiledSource = sourceCode
    intermediateCode = null

    window.editor.setError(null)
    consoleInput.disabled = false
    consoleInput.placeholder = '>'
  } catch (e) {
    writeOutputError(e)

    window.editor.setError(errorLocation(e))
    consoleInput.disabled = true
    consoleInput.placeholder = ''
  } finally {
    if (intermediateCode !== null) {
      disposeCode(intermediateCode)
    }
  }
}

// Compiling runs the whole program, so it waits for a pause in typing rather
// than happening per keystroke. The console evaluates against that compiled
// program and must not lag behind it, so it is disabled the moment the source
// changes and only comes back when the settled compile succeeds.
function onInputChange() {
  document.getElementById('consoleInput').disabled = true
}

function onInputSettle() {
  recompile()
}

function recompile() {
  const sourceCode = window.editor.getValue()
  clearOutput()
  compileCode(sourceCode)
}

function onLoadFile() {
  const loadFile = document.getElementById('loadFile')
  loadFile.click()
}

function onFileLoaded(e) {
  const file = e.files[0]
  const reader = new FileReader()
  reader.onload = function (e) {
    replaceSourceCode(e.target.result)
  }
  reader.readAsText(file)
}

function replaceSourceCode(text) {
  // Silent, because the compile below is the one that should run; announcing the
  // change would schedule a second compile of the very same text.
  window.editor.setValue(text, { silent: true })
  recompile()
}

function loadSample(name) {
  const sample = SAMPLES[name]

  if (sample) {
    replaceSourceCode(sample)
  }
}

// The Clipboard API is missing outside secure contexts and can still reject when
// present, so the confirmation toast only appears once the write has succeeded.
function copyToClipboard(text, successToast) {
  if (!navigator.clipboard) {
    showToast('toastCopyFailed')

    return
  }

  navigator.clipboard.writeText(text)
    .then(function () {
      showToast(successToast)
    })
    .catch(function () {
      showToast('toastCopyFailed')
    })
}

function copySourceCode() {
  copyToClipboard(window.editor.getValue(), 'toastTextCopied')
}

function share() {
  copyToClipboard(window.location.href, 'toastUrlCopied')
}

function showToast(name) {
  const toast = document.getElementById(name)
  bootstrap.Toast.getOrCreateInstance(toast, { delay: 2000 }).show()
}

function feedbackModal() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('feedbackModal'))
}

function sendFeedback() {
  feedbackModal().show()
}

function onSendFeedback() {
  const feedbackText = document.getElementById('feedbackText')
  const message = feedbackText.value.trim()

  if (!message) {
    return
  }

  const sendFeedbackButton = document.getElementById('sendFeedbackButton')
  sendFeedbackButton.disabled = true

  sendFeedbackMessage(message)
    .then(function () {
      feedbackModal().hide()
      onFeedbackModalClosed()
      showToast('toastFeedbackSent')
    })
    .catch(function () {
      // The message stays in the box so nothing has to be retyped.
      sendFeedbackButton.disabled = false
      showToast('toastFeedbackFailed')
    })
}

function onFeedbackModalClosed() {
  const feedbackText = document.getElementById('feedbackText')
  feedbackText.value = ''
  const sendFeedbackButton = document.getElementById('sendFeedbackButton')
  sendFeedbackButton.disabled = true
}

function onFeedbackInputChange() {
  const sendFeedbackButton = document.getElementById('sendFeedbackButton')
  const feedbackText = document.getElementById('feedbackText')
  sendFeedbackButton.disabled = feedbackText.value.trim() == ''
}

function createOutputElement(text, styleClass) {
  const element = document.createElement('div')
  element.textContent = text
  element.classList.add('base-output')
  element.classList.add(styleClass)

  return element
}

function clearOutput() {
  while (output.hasChildNodes()) {
    output.removeChild(output.lastChild);
  }
}

function clearOutputManual() {
  clearOutput()
  showToast('toastOutputCleared')
}

function writeOutputWarning(text) {
  writeOutput(createOutputElement(text, 'output-warning'))
}

function writeOutputError(text) {
  writeOutput(createOutputElement(text, 'output-error'))
}

function writeOutputSuccess(text) {
  writeOutput(createOutputElement(text, 'output-success'))
}

function writeOutput(element) {
  const output = document.getElementById('output')
  output.appendChild(element)
}

function evaluateConsoleInput() {
  const inputElement = document.getElementById('consoleInput')
  const inputValue = inputElement.value.trim()

  if (inputValue) {
    INPUTS.push(inputValue)
    localStorage.setItem('consoleHistory', JSON.stringify(INPUTS))
    inputIndex = INPUTS.length
    inputElement.value = ''

    let intermediateCode = null
    let expression = null
    let reused = false

    try {
      const sourceCode = window.editor.getValue()

      // The last compile is reused while it still matches the source, so typing
      // an expression evaluates it instead of recompiling the whole program.
      reused = (compiledCode !== null) && (compiledSource === sourceCode)
      intermediateCode = reused
        ? compiledCode
        : (sourceCode ? compileInput(sourceCode) : intermediateRepresentationEmpty())

      expression = compileExpression(inputValue)
      const result = runtimeReduce(intermediateCode, expression)
      writeOutputSuccess(result)
    } catch (e) {
      writeOutputError(e)
    } finally {
      // A reused program stays registered: the cache, not this call, owns it.
      if ((intermediateCode !== null) && !reused) {
        disposeCode(intermediateCode)
      }

      if (expression !== null) {
        disposeExpression(expression)
      }
    }

    const consoleElement = document.getElementById('output')

    if (consoleElement) {
      consoleElement.scrollTop = consoleElement.scrollHeight
    }
  }
}

function showInputBefore() {
  if (inputIndex !== -1) {
    if (inputIndex > 0) {
      inputIndex--
    }
    showInputHistory()
  }
}

function showInputAfter() {
  if (inputIndex !== -1) {
    if (inputIndex < INPUTS.length) {
      inputIndex++
    }
    showInputHistory()
  }
}

function showInputHistory() {
  const consoleInput = document.getElementById('consoleInput')

  if (inputIndex >= 0 && inputIndex < INPUTS.length) {
    consoleInput.value = INPUTS[inputIndex]
  } else if (inputIndex === INPUTS.length) {
    consoleInput.value = ''
  }
}

function getSample(url, name) {
  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error(`Could not load ${url}`)
      }

      return response.text()
    })
    .then(function (data) {
      SAMPLES[name] = data
    })
    .catch(function (error) {
      console.error(error)
    })
}

document.addEventListener('DOMContentLoaded', function () {
  Split(['#split-0', '#split-1'], {
    minSize: 500,
    gutterAlign: 'end',
    snapOffset: 0,
  })

  window.editor = createPrimalEditor(document.getElementById('sourceCode'), {
    label: 'Primal source code',
    value: localStorage.getItem('sourceCode') ? localStorage.getItem('sourceCode') : SAMPLES['default'],
  })

  window.editor.on('change', onInputChange)
  window.editor.on('settle', onInputSettle)

  const actions = {
    'load': onLoadFile,
    'clear': clearOutputManual,
    'copy': copySourceCode,
    'share': share,
    'feedback': sendFeedback,
    'send-feedback': onSendFeedback,
  }

  document.querySelectorAll('[data-action]').forEach(function (button) {
    button.addEventListener('click', actions[button.dataset.action])
  })

  document.querySelectorAll('[data-sample]').forEach(function (button) {
    button.addEventListener('click', function () {
      loadSample(button.dataset.sample)
    })
  })

  document.getElementById('loadFile').addEventListener('change', function () {
    onFileLoaded(this)
  })

  document.getElementById('feedbackText').addEventListener('input', onFeedbackInputChange)

  // Covers every way out of the modal: the close button, Escape and the backdrop.
  document.getElementById('feedbackModal')
    .addEventListener('hidden.bs.modal', onFeedbackModalClosed)

  document.getElementById('consoleInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      evaluateConsoleInput()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      showInputBefore()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      showInputAfter()
    }
  })

  recompile()
})
