function setSampleCode(id, content) {
  document.addEventListener('DOMContentLoaded', function () {
    window.editor = CodeMirror(document.getElementById(id), {
      ...basicProperties,
      lineNumbers: false,
      value: content,
      readOnly: true,
    })
  })
}

// https://github.com/erosman/CodeMirror-plus/tree/main/addon/mode
(function (mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  CodeMirror.defineOption("keyword", {}, function (cm, val, prev) {
    if (prev == CodeMirror.Init) prev = false;
    if (prev && !val)
      cm.removeOverlay("keyword");
    else if (!prev && val)
      cm.addOverlay({
        token: function (stream) {
          for (var key in cm.options.keyword) {
            if (stream.match(key, true)) return cm.options.keyword[key];
          }
          stream.next();
        },
        name: "keyword"
      });
  });
});

const basicProperties = {
  mode: 'javascript',
  theme: 'dracula',
  keyword: {
    "Boolean": "custom-type",
    "Number": "custom-type",
    "String": "custom-type",

    "(": "custom-parenthesis",
    ")": "custom-parenthesis",

    "=": "custom-marker",
    ":": "custom-marker",

    "if": "custom-keyword",
    "try": "custom-keyword",
    "gt": "custom-keyword",
  }
}