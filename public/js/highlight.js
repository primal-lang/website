function setSampleCode(id, content) {
  document.addEventListener('DOMContentLoaded', function () {
    window.editor = CodeMirror(document.getElementById(id), {
      lineNumbers: false,
      mode: 'javascript',
      theme: 'dracula',
      value: content,
      readOnly: true,
    })
  })
}