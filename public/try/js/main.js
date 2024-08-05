const SAMPLES = {
  'factorial': 'factorial(n) = if(isZero(n), 1, mul(n, factorial(dec(n))))\n\nmain = factorial(5)',
  'fibonacci': 'fibonacci(n) = if(isZero(n), 0, if(eq(n, 1), 1, sum(fibonacci(dec(n)), fibonacci(sub(n, 2)))))\n\nmain = fibonacci(10)',
  'isPrime': 'isPrime(n) = if(le(n, 1), false, if(eq(n, 2), true, if(isEven(n), false, isPrimeHelper(n, 3))))\n\nisPrimeHelper(n, divisor) = if(gt(mul(divisor, divisor), n), true, if(eq(mod(n, divisor), 0), false, isPrimeHelper(n, sum(divisor, 2))))\n\nmain = isPrime(97)',
  'power': 'power(base, exp) = if(isZero(exp), 1, mul(base, power(base, sub(exp, 1))))\n\nmain = power(2, 10)',
  'sumOfDigits': 'sumOfDigits(n) = if(isZero(n), 0, sum(mod(n, 10), sumOfDigits(divInt(n, 10))))\n\nmain = sumOfDigits(12345)',
}

function compileCode(sourceCode) {
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
  } catch (e) {
    writeOutputError(e)
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

// ---------------

function clearOutput() {
  writeOutput('', 'white')
}

function writeOutputSuccess(text) {
  writeOutput(text, 'white')
}

function writeOutputWarning(text) {
  writeOutput(text, 'yellow')
}

function writeOutputError(text) {
  writeOutput(text, 'red')
}

function writeOutput(text, color) {
  const output = document.getElementById('output')
  output.style.color = color
  output.innerHTML = text
}
