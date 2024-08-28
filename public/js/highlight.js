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

    // string
    "substring\\s*(\?=\\()": "custom-keyword",
    "startsWith\\s*(\?=\\()": "custom-keyword",
    "endsWith\\s*(\?=\\()": "custom-keyword",
    "replace\\s*(\?=\\()": "custom-keyword",
    "uppercase\\s*(\?=\\()": "custom-keyword",
    "lowercase\\s*(\?=\\()": "custom-keyword",
    "trim\\s*(\?=\\()": "custom-keyword",
    "match\\s*(\?=\\()": "custom-keyword",
    "length\\s*(\?=\\()": "custom-keyword",
    "concat\\s*(\?=\\()": "custom-keyword",
    "first\\s*(\?=\\()": "custom-keyword",
    "last\\s*(\?=\\()": "custom-keyword",
    "init\\s*(\?=\\()": "custom-keyword",
    "tail\\s*(\?=\\()": "custom-keyword",
    "at\\s*(\?=\\()": "custom-keyword",
    "isEmpty\\s*(\?=\\()": "custom-keyword",
    "isNotEmpty\\s*(\?=\\()": "custom-keyword",
    "contains\\s*(\?=\\()": "custom-keyword",
    "take\\s*(\?=\\()": "custom-keyword",
    "drop\\s*(\?=\\()": "custom-keyword",
    "remove\\s*(\?=\\()": "custom-keyword",
    "reverse\\s*(\?=\\()": "custom-keyword",

    // comparison
    "eq\\s*(\?=\\()": "custom-keyword",
    "neq\\s*(\?=\\()": "custom-keyword",
    "gt\\s*(\?=\\()": "custom-keyword",
    "lt\\s*(\?=\\()": "custom-keyword",
    "ge\\s*(\?=\\()": "custom-keyword",
    "le\\s*(\?=\\()": "custom-keyword",

    // arithmetic
    "abs\\s*(\?=\\()": "custom-keyword",
    "negative\\s*(\?=\\()": "custom-keyword",
    "inc\\s*(\?=\\()": "custom-keyword",
    "dec\\s*(\?=\\()": "custom-keyword",
    "add\\s*(\?=\\()": "custom-keyword",
    "sum\\s*(\?=\\()": "custom-keyword",
    "sub\\s*(\?=\\()": "custom-keyword",
    "mul\\s*(\?=\\()": "custom-keyword",
    "divInt\\s*(\?=\\()": "custom-keyword",
    "div\\s*(\?=\\()": "custom-keyword",
    "mod\\s*(\?=\\()": "custom-keyword",
    "pow\\s*(\?=\\()": "custom-keyword",
    "sqrt\\s*(\?=\\()": "custom-keyword",
    "min\\s*(\?=\\()": "custom-keyword",
    "max\\s*(\?=\\()": "custom-keyword",
    "round\\s*(\?=\\()": "custom-keyword",
    "floor\\s*(\?=\\()": "custom-keyword",
    "ceil\\s*(\?=\\()": "custom-keyword",
    "sin\\s*(\?=\\()": "custom-keyword",
    "cos\\s*(\?=\\()": "custom-keyword",
    "tan\\s*(\?=\\()": "custom-keyword",
    "log\\s*(\?=\\()": "custom-keyword",
    "isNegative\\s*(\?=\\()": "custom-keyword",
    "isPositive\\s*(\?=\\()": "custom-keyword",
    "isZero\\s*(\?=\\()": "custom-keyword",
    "isEven\\s*(\?=\\()": "custom-keyword",
    "isOdd\\s*(\?=\\()": "custom-keyword",

    // logic
    "and\\s*(\?=\\()": "custom-keyword",
    "or\\s*(\?=\\()": "custom-keyword",
    "xor\\s*(\?=\\()": "custom-keyword",
    "not\\s*(\?=\\()": "custom-keyword",

    // casting
    "toNumber\\s*(\?=\\()": "custom-keyword",
    "toInteger\\s*(\?=\\()": "custom-keyword",
    "toDecimal\\s*(\?=\\()": "custom-keyword",
    "toString\\s*(\?=\\()": "custom-keyword",
    "toBoolean\\s*(\?=\\()": "custom-keyword",
    "isNumber\\s*(\?=\\()": "custom-keyword",
    "isInteger\\s*(\?=\\()": "custom-keyword",
    "isDecimal\\s*(\?=\\()": "custom-keyword",
    "isInfinite\\s*(\?=\\()": "custom-keyword",
    "isString\\s*(\?=\\()": "custom-keyword",
    "isBoolean\\s*(\?=\\()": "custom-keyword",
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