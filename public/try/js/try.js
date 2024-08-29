const DEFAULT_SAMPLE = `isBiggerThan10(n) = n > 10

main = isBiggerThan10(7)`

const FACTORIAL_SAMPLE = `factorial(n) = if (n < 0)
                   error.throw(0, "Cannot calculate factorial of a negative number")
               else if (n == 0)
                   1
               else
                   n * factorial(n - 1)

main = factorial(5)`

const FIBONACCI_SAMPLE = `fibonacci(n) = if (n == 0)
                   0
               else if (n == 1)
                   1
               else
                   fibonacci(n - 1) + fibonacci(n - 2)

main = fibonacci(10)`

const IS_PRIME_SAMPLE = `isPrime(n) = if (n <= 1)
                 false
             else if (n == 2)
                 true
             else if (num.isEven(n))
                 false
             else
                 isPrimeHelper(n, 3)

isPrimeHelper(n, divisor) = if (divisor * divisor > n)
                                true
                            else if ((n % divisor) == 0)
                                false
                            else
                                isPrimeHelper(n, divisor + 2)

main = isPrime(97)`

const POWER_SAMPLE = `power(base, exp) = if (exp == 0)
                       1
                   else
                      base * power(base, exp - 1)

main = power(2, 10)`

const SUM_OF_DIGITS_SAMPLE = `sumOfDigits(n) = if (n == 0)
                     0
                 else
                     n % 10 + sumOfDigits(to.integer(n / 10))

main = sumOfDigits(123456789)`

const TO_BINARY_SAMPLE = `toBinary(n) = if (n == 0)
                  "0"
              else if (n == 1)
                  "1"
              else
                  str.concat(toBinary(to.integer(n / 2)), to.string(n % 2))

main = toBinary(10)`

const IS_PALINDROME_SAMPLE = `isPalindrome(s) = isPalindromeHelper(s, 0, str.length(s) - 1)

isPalindromeHelper(s, start, end) = if (start >= end)
                                        true
                                    else if (str.at(s, start) != str.at(s, end))
                                        false
                                    else
                                        isPalindromeHelper(s, start + 1, end - 1)

main = isPalindrome("level")`

const SAMPLES = {
  'default': DEFAULT_SAMPLE,
  'factorial': FACTORIAL_SAMPLE,
  'fibonacci': FIBONACCI_SAMPLE,
  'isPrime': IS_PRIME_SAMPLE,
  'power': POWER_SAMPLE,
  'sumOfDigits': SUM_OF_DIGITS_SAMPLE,
  'toBinary': TO_BINARY_SAMPLE,
  'isPalindrome': IS_PALINDROME_SAMPLE,
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