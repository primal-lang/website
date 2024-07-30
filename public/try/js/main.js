const SAMPLES = {
  'factorial': 'factorial(n) = if(isZero(n), 1, mul(n, factorial(dec(n))))\n\nmain = factorial(5)',
  'fibonacci': 'fibonacci(n) = if(isZero(n), 0, if(eq(n, 1), 1, sum(fibonacci(dec(n)), fibonacci(sub(n, 2)))))\n\nmain = fibonacci(10)',
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
  clearOutput()
  const sourceCode = document.getElementById('sourceCode').value
  compileCode(sourceCode.trim())
}

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

function onLoadFile() {
  const loadFile = document.getElementById('loadFile')
  loadFile.click()
}

function fileLoaded(e) {
  const file = e.files[0]
  const reader = new FileReader()
  reader.onload = function (e) {
    replaceSourceCode(e.target.result)
  }
  reader.readAsText(file)
}

function replaceSourceCode(text) {
  document.getElementById('sourceCode').value = text
  onInputChange()
}

function loadSample(name) {
  const sample = SAMPLES[name]

  if (sample) {
    replaceSourceCode(sample)
  }
}

function copySourceCode() {
  const sourceCode = document.getElementById('sourceCode').value
  navigator.clipboard.writeText(sourceCode)
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

function clearConsole() {
  const output = document.getElementById('output')
  output.innerHTML = ''
}

function sendFeedback() {
  $('#feedbackModal').modal('show')
}

function onSendFeedback() {
  const feedbackText = document.getElementById('feedbackText')
  console.log(feedbackText.value)
  $('#feedbackModal').modal('hide')
  feedbackText.value = ''
  showToast('toastFeedbackSent')
}