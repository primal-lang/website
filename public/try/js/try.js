const SAMPLES = {
  'default': 'isBiggerThan10(n) = n > 10\n\nmain = isBiggerThan10(7)',
  'factorial': 'factorial(n) = if(n == 0, 1, n * factorial(n - 1))\n\nmain = factorial(5)',
  'fibonacci': 'fibonacci(n) = if(n == 0, 0, if(n == 1, 1, fibonacci(n - 1) + fibonacci(n - 2)))\n\nmain = fibonacci(10)',
  'isPrime': 'isPrime(n) = if(n <= 1, false, if(n == 2, true, if(num.isEven(n), false, isPrimeHelper(n, 3))))\n\nisPrimeHelper(n, divisor) = if(divisor * divisor > n, true, if((n % divisor) == 0, false, isPrimeHelper(n, divisor + 2)))\n\nmain = isPrime(97)',
  'power': 'power(base, exp) = if(exp == 0, 1, base * power(base, exp - 1))\n\nmain = power(2, 10)',
  'sumOfDigits': 'sumOfDigits(n) = if(n == 0, 0, n % 10 + sumOfDigits(to.integer(n / 10)))\n\nmain = sumOfDigits(12345)',
  'toBinary': 'toBinary(n) = if(n == 0, "0", if(n == 1, "1", str.concat(toBinary(to.integer(n / 2)), to.string(n % 2))))\n\nmain = toBinary(10)',
  'isPalindrome': 'isPalindrome(s) = isPalindromeHelper(s, 0, str.length(s) - 1)\n\nisPalindromeHelper(s, start, end) = if(start >= end, true, if(str.at(s, start) != str.at(s, end), false, isPalindromeHelper(s, start + 1, end - 1)))\n\nmain = isPalindrome("level")',
}

const INPUTS = localStorage.getItem('consoleHistory') ? JSON.parse(localStorage.getItem('consoleHistory')) : []
let inputIndex = (INPUTS.length > 0) ? INPUTS.length : -1

function compileCode(sourceCode) {
  const consoleInput = document.getElementById('consoleInput')

  try {
    const intermediateCode = sourceCode ? compileInput(sourceCode) : intermediateCodeEmpty()
    const warnings = runtimeWarnings(intermediateCode)

    for (const warning of warnings) {
      writeOutputWarning(warning)
    }

    if (runtimeHasMain(intermediateCode)) {
      const result = runtimeExecuteMain(intermediateCode)
      writeOutputSuccess(result)
    }

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
  localStorage.setItem('sourceCode', sourceCode)
  clearOutput()
  compileCode(sourceCode.trim())
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
  const toastTextCopied = document.getElementById(name)
  bootstrap.Toast.Default.delay = 2000
  bootstrap.Toast.getOrCreateInstance(toastTextCopied).show()
}

function sendFeedback() {
  $('#feedbackModal').modal('show')
}

function onSendFeedback() {
  const feedbackText = document.getElementById('feedbackText')
  sendFeedbackMessage(feedbackText.value)
  $('#feedbackModal').modal('hide')
  onFeedbackModalClosed()
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

function sendFeedbackMessage(message) {
  const settings = {
    async: true,
    crossDomain: true,
    url: `https://script.google.com/macros/s/AKfycbyC85weq4p2Ra2zbfyGrA4wC41s3ev-UumQek7xJMUtRmr-qGuXip6NN9m1k1GFCiT-/exec?message=${message}`,
    method: 'GET',
  }

  $.ajax(settings)

  showToast('toastFeedbackSent')
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
      const intermediateCode = sourceCode ? compileInput(sourceCode) : intermediateCodeEmpty()
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