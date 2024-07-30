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
  writeOutput('', 'black')
}

function writeOutputSuccess(text) {
  writeOutput(text, 'black')
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
    const content = e.target.result
    document.getElementById('sourceCode').value = content
  }
  reader.readAsText(file)
}