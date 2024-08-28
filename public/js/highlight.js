function setSampleCode(id, content) {
  document.addEventListener('DOMContentLoaded', function () {
    window.editor = CodeMirror(document.getElementById(id), {
      ...basicProperties(true),
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
            if (stream.match(new RegExp(key))) {
              return cm.options.keyword[key];
            }
          }
          stream.next();
        },
        name: "keyword"
      });
  });
});

const basicProperties = (withExtras) => {
  const extras = {
    "Boolean": "custom-type",
    "Number": "custom-type",
    "String": "custom-type",
    "Error": "custom-type",
    "Any": "custom-type",

    // main
    "main\\s": "custom-keyword",

    // control
    "if\\s*(\?=\\()": "custom-keyword",
    "try\\s*(\?=\\()": "custom-keyword",

    // error
    "error\\s*(\?=\\()": "custom-keyword",

    // debug
    "debug\\s*(\?=\\()": "custom-keyword",

    // comparison
    "comp.eq\\s*(\?=\\()": "custom-keyword",
    "comp.neq\\s*(\?=\\()": "custom-keyword",
    "comp.gt\\s*(\?=\\()": "custom-keyword",
    "comp.lt\\s*(\?=\\()": "custom-keyword",
    "comp.ge\\s*(\?=\\()": "custom-keyword",
    "comp.le\\s*(\?=\\()": "custom-keyword",

    // arithmetic
    "num.abs\\s*(\?=\\()": "custom-keyword",
    "num.negative\\s*(\?=\\()": "custom-keyword",
    "num.inc\\s*(\?=\\()": "custom-keyword",
    "num.dec\\s*(\?=\\()": "custom-keyword",
    "num.add\\s*(\?=\\()": "custom-keyword",
    "num.sum\\s*(\?=\\()": "custom-keyword",
    "num.sub\\s*(\?=\\()": "custom-keyword",
    "num.mul\\s*(\?=\\()": "custom-keyword",
    "num.div\\s*(\?=\\()": "custom-keyword",
    "num.mod\\s*(\?=\\()": "custom-keyword",
    "num.pow\\s*(\?=\\()": "custom-keyword",
    "num.sqrt\\s*(\?=\\()": "custom-keyword",
    "num.min\\s*(\?=\\()": "custom-keyword",
    "num.max\\s*(\?=\\()": "custom-keyword",
    "num.round\\s*(\?=\\()": "custom-keyword",
    "num.floor\\s*(\?=\\()": "custom-keyword",
    "num.ceil\\s*(\?=\\()": "custom-keyword",
    "num.sin\\s*(\?=\\()": "custom-keyword",
    "num.cos\\s*(\?=\\()": "custom-keyword",
    "num.tan\\s*(\?=\\()": "custom-keyword",
    "num.log\\s*(\?=\\()": "custom-keyword",
    "num.isNegative\\s*(\?=\\()": "custom-keyword",
    "num.isPositive\\s*(\?=\\()": "custom-keyword",
    "num.isZero\\s*(\?=\\()": "custom-keyword",
    "num.isEven\\s*(\?=\\()": "custom-keyword",
    "num.isOdd\\s*(\?=\\()": "custom-keyword",

    // logic
    "bool.and\\s*(\?=\\()": "custom-keyword",
    "bool.or\\s*(\?=\\()": "custom-keyword",
    "bool.xor\\s*(\?=\\()": "custom-keyword",
    "bool.not\\s*(\?=\\()": "custom-keyword",

    // string
    "str.substring\\s*(\?=\\()": "custom-keyword",
    "str.startsWith\\s*(\?=\\()": "custom-keyword",
    "str.endsWith\\s*(\?=\\()": "custom-keyword",
    "str.replace\\s*(\?=\\()": "custom-keyword",
    "str.uppercase\\s*(\?=\\()": "custom-keyword",
    "str.lowercase\\s*(\?=\\()": "custom-keyword",
    "str.trim\\s*(\?=\\()": "custom-keyword",
    "str.match\\s*(\?=\\()": "custom-keyword",
    "str.length\\s*(\?=\\()": "custom-keyword",
    "str.concat\\s*(\?=\\()": "custom-keyword",
    "str.first\\s*(\?=\\()": "custom-keyword",
    "str.last\\s*(\?=\\()": "custom-keyword",
    "str.init\\s*(\?=\\()": "custom-keyword",
    "str.tail\\s*(\?=\\()": "custom-keyword",
    "str.at\\s*(\?=\\()": "custom-keyword",
    "str.isEmpty\\s*(\?=\\()": "custom-keyword",
    "str.isNotEmpty\\s*(\?=\\()": "custom-keyword",
    "str.contains\\s*(\?=\\()": "custom-keyword",
    "str.take\\s*(\?=\\()": "custom-keyword",
    "str.drop\\s*(\?=\\()": "custom-keyword",
    "str.remove\\s*(\?=\\()": "custom-keyword",
    "str.reverse\\s*(\?=\\()": "custom-keyword",

    // casting
    "to.number\\s*(\?=\\()": "custom-keyword",
    "to.integer\\s*(\?=\\()": "custom-keyword",
    "to.decimal\\s*(\?=\\()": "custom-keyword",
    "to.string\\s*(\?=\\()": "custom-keyword",
    "to.boolean\\s*(\?=\\()": "custom-keyword",

    // checking
    "is.number\\s*(\?=\\()": "custom-keyword",
    "is.integer\\s*(\?=\\()": "custom-keyword",
    "is.decimal\\s*(\?=\\()": "custom-keyword",
    "is.infinite\\s*(\?=\\()": "custom-keyword",
    "is.string\\s*(\?=\\()": "custom-keyword",
    "is.boolean\\s*(\?=\\()": "custom-keyword",
  }

  return {
    mode: 'javascript',
    theme: 'dracula',
    keyword: {
      "\\(": "custom-parenthesis",
      "\\)": "custom-parenthesis",
      "\\[": "custom-parenthesis",
      "\\]": "custom-parenthesis",
      "\\{": "custom-parenthesis",
      "\\}": "custom-parenthesis",

      "=": "custom-marker",

      ...withExtras && extras,
    }
  }
}