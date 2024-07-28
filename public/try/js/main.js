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