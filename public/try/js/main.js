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
  compileCode(window.editor.getValue().trim())
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
  window.editor.setValue(text)
  onInputChange()
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

function clearConsole() {
  const output = document.getElementById('output')
  output.innerHTML = ''
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
    url: `https://script.google.com/macros/s/AKfycbxkEJf_0bb-BqGQ4RW82KvXZSUrMwcDeFFqd9TtQPS7CQ9nF7O_JcSsGy6OVusSzD4s/exec?message=${message}`,
    method: 'GET',
  }

  $.ajax(settings).done((response) => {
    console.log(response)
    showToast('toastFeedbackSent')
  })
}