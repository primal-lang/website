const SAMPLES = {
  'default': `/*
  Input: a positive number
  Output: true if the number is bigger than 10, false otherwise
*/

isBiggerThan10(n) = n > 10

main = isBiggerThan10(7)`,
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

const INPUTS = localStorage.getItem('consoleHistory') ? JSON.parse(localStorage.getItem('consoleHistory')) : []
let inputIndex = (INPUTS.length > 0) ? INPUTS.length : -1

function compileCode(sourceCode) {
  const consoleInput = document.getElementById('consoleInput')

  try {
    const intermediateCode = sourceCode ? compileInput(sourceCode) : intermediateRepresentationEmpty()
    const warnings = runtimeWarnings(intermediateCode)

    for (const warning of warnings) {
      writeOutputWarning(warning)
    }

    if (runtimeHasMain(intermediateCode)) {
      const result = runtimeExecuteMain(intermediateCode)
      writeOutputSuccess(result)
    }

    localStorage.setItem('sourceCode', sourceCode)

    consoleInput.disabled = false
    consoleInput.placeholder = '>'
  } catch (e) {
    writeOutputError(e)

    consoleInput.disabled = true
    consoleInput.placeholder = ''
  }
}

function onInputChange() {
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
  window.editor.setValue(text)
  recompile()
}

function loadSample(name) {
  const sample = SAMPLES[name]

  if (sample) {
    replaceSourceCode(sample)
  }
}

function copySourceCode() {
  navigator.clipboard.writeText(window.editor.getValue())
  showToast('toastTextCopied')
}

function share() {
  navigator.clipboard.writeText(window.location.href)
  showToast('toastUrlCopied')
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

    try {
      const sourceCode = window.editor.getValue().trim()
      const intermediateCode = sourceCode ? compileInput(sourceCode) : intermediateRepresentationEmpty()
      const expression = compileExpression(inputValue)
      const result = runtimeReduce(intermediateCode, expression)
      writeOutputSuccess(result)
    } catch (e) {
      writeOutputError(e)
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

  window.editor = CodeMirror(document.getElementById('sourceCode'), {
    ...basicProperties(true),
    lineNumbers: true,
    value: localStorage.getItem('sourceCode') ? localStorage.getItem('sourceCode') : SAMPLES['default'],
  })

  window.editor.on('change', onInputChange)

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
