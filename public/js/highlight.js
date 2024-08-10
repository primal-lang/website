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
            if (stream.match(key, true)) return cm.options.keyword[key];
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
    "main": "custom-keyword",

    // control
    "if": "custom-keyword",
    "try": "custom-keyword",

    // error
    "error": "custom-keyword",

    // debug
    "debug": "custom-keyword",

    // string
    "substring": "custom-keyword",
    "startsWith": "custom-keyword",
    "endsWith": "custom-keyword",
    "replace": "custom-keyword",
    "uppercase": "custom-keyword",
    "lowercase": "custom-keyword",
    "trim": "custom-keyword",
    "match": "custom-keyword",
    "length": "custom-keyword",
    "concat": "custom-keyword",
    "first": "custom-keyword",
    "last": "custom-keyword",
    "init": "custom-keyword",
    "tail": "custom-keyword",
    "at": "custom-keyword",
    "isEmpty": "custom-keyword",
    "isNotEmpty": "custom-keyword",
    "contains": "custom-keyword",
    "take": "custom-keyword",
    "drop": "custom-keyword",
    "remove": "custom-keyword",
    "reverse": "custom-keyword",

    // comparison
    "eq": "custom-keyword",
    "neq": "custom-keyword",
    "gt": "custom-keyword",
    "lt": "custom-keyword",
    "ge": "custom-keyword",
    "le": "custom-keyword",

    // arithmetic
    "abs": "custom-keyword",
    "inc": "custom-keyword",
    "dec": "custom-keyword",
    "add": "custom-keyword",
    "sum": "custom-keyword",
    "sub": "custom-keyword",
    "mul": "custom-keyword",
    "divInt": "custom-keyword",
    "div": "custom-keyword",
    "mod": "custom-keyword",
    "pow": "custom-keyword",
    "sqrt": "custom-keyword",
    "min": "custom-keyword",
    "max": "custom-keyword",
    "round": "custom-keyword",
    "floor": "custom-keyword",
    "ceil": "custom-keyword",
    "sin": "custom-keyword",
    "cos": "custom-keyword",
    "tan": "custom-keyword",
    "log": "custom-keyword",
    "isNegative": "custom-keyword",
    "isPositive": "custom-keyword",
    "isZero": "custom-keyword",
    "isEven": "custom-keyword",
    "isOdd": "custom-keyword",

    // logic
    "and": "custom-keyword",
    "or": "custom-keyword",
    "xor": "custom-keyword",
    "not": "custom-keyword",

    // casting
    "toNumber": "custom-keyword",
    "toInteger": "custom-keyword",
    "toDecimal": "custom-keyword",
    "toString": "custom-keyword",
    "toBoolean": "custom-keyword",
    "isNumber": "custom-keyword",
    "isInteger": "custom-keyword",
    "isDecimal": "custom-keyword",
    "isInfinite": "custom-keyword",
    "isString": "custom-keyword",
    "isBoolean": "custom-keyword",
  }

  return {
    mode: 'javascript',
    theme: 'dracula',
    keyword: {
      "(": "custom-parenthesis",
      ")": "custom-parenthesis",
      "[": "custom-parenthesis",
      "]": "custom-parenthesis",
      "{": "custom-parenthesis",
      "}": "custom-parenthesis",

      "=": "custom-marker",
      ":": "custom-marker",

      ...withExtras && extras,
    }
  }
}