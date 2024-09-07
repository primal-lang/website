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
    "List": "custom-type",
    "Map": "custom-type",
    "Error": "custom-type",
    "Any": "custom-type",

    // main
    "main\\s": "custom-keyword",

    // control
    "if\\s*": "custom-keyword",
    "else\\s*": "custom-keyword",
    "try\\s*(\?=\\()": "custom-native-function",

    // error
    "error\\.throw\\s*(\?=\\()": "custom-native-function",

    // comparison
    "comp\\.eq\\s*(\?=\\()": "custom-native-function",
    "comp\\.neq\\s*(\?=\\()": "custom-native-function",
    "comp\\.gt\\s*(\?=\\()": "custom-native-function",
    "comp\\.lt\\s*(\?=\\()": "custom-native-function",
    "comp\\.ge\\s*(\?=\\()": "custom-native-function",
    "comp\\.le\\s*(\?=\\()": "custom-native-function",

    // arithmetic
    "num\\.abs\\s*(\?=\\()": "custom-native-function",
    "num\\.negative\\s*(\?=\\()": "custom-native-function",
    "num\\.inc\\s*(\?=\\()": "custom-native-function",
    "num\\.dec\\s*(\?=\\()": "custom-native-function",
    "num\\.add\\s*(\?=\\()": "custom-native-function",
    "num\\.sum\\s*(\?=\\()": "custom-native-function",
    "num\\.sub\\s*(\?=\\()": "custom-native-function",
    "num\\.mul\\s*(\?=\\()": "custom-native-function",
    "num\\.div\\s*(\?=\\()": "custom-native-function",
    "num\\.mod\\s*(\?=\\()": "custom-native-function",
    "num\\.pow\\s*(\?=\\()": "custom-native-function",
    "num\\.sqrt\\s*(\?=\\()": "custom-native-function",
    "num\\.min\\s*(\?=\\()": "custom-native-function",
    "num\\.max\\s*(\?=\\()": "custom-native-function",
    "num\\.round\\s*(\?=\\()": "custom-native-function",
    "num\\.floor\\s*(\?=\\()": "custom-native-function",
    "num\\.ceil\\s*(\?=\\()": "custom-native-function",
    "num\\.sin\\s*(\?=\\()": "custom-native-function",
    "num\\.cos\\s*(\?=\\()": "custom-native-function",
    "num\\.tan\\s*(\?=\\()": "custom-native-function",
    "num\\.log\\s*(\?=\\()": "custom-native-function",
    "num\\.isNegative\\s*(\?=\\()": "custom-native-function",
    "num\\.isPositive\\s*(\?=\\()": "custom-native-function",
    "num\\.isZero\\s*(\?=\\()": "custom-native-function",
    "num\\.isEven\\s*(\?=\\()": "custom-native-function",
    "num\\.isOdd\\s*(\?=\\()": "custom-native-function",
    "num\\.asRadians\\s*(\?=\\()": "custom-native-function",
    "num\\.asDegrees\\s*(\?=\\()": "custom-native-function",
    "num\\.infinity\\s*(\?=\\()": "custom-native-function",
    "num\\.fraction\\s*(\?=\\()": "custom-native-function",
    "num\\.clamp\\s*(\?=\\()": "custom-native-function",
    "num\\.sign\\s*(\?=\\()": "custom-native-function",
    "num\\.integerRandom\\s*(\?=\\()": "custom-native-function",
    "num\\.decimalRandom\\s*(\?=\\()": "custom-native-function",
    "num\\.compare\\s*(\?=\\()": "custom-native-function",

    // logic
    "bool\\.and\\s*(\?=\\()": "custom-native-function",
    "bool\\.or\\s*(\?=\\()": "custom-native-function",
    "bool\\.xor\\s*(\?=\\()": "custom-native-function",
    "bool\\.not\\s*(\?=\\()": "custom-native-function",

    // string
    "str\\.substring\\s*(\?=\\()": "custom-native-function",
    "str\\.startsWith\\s*(\?=\\()": "custom-native-function",
    "str\\.endsWith\\s*(\?=\\()": "custom-native-function",
    "str\\.replace\\s*(\?=\\()": "custom-native-function",
    "str\\.uppercase\\s*(\?=\\()": "custom-native-function",
    "str\\.lowercase\\s*(\?=\\()": "custom-native-function",
    "str\\.trim\\s*(\?=\\()": "custom-native-function",
    "str\\.match\\s*(\?=\\()": "custom-native-function",
    "str\\.length\\s*(\?=\\()": "custom-native-function",
    "str\\.concat\\s*(\?=\\()": "custom-native-function",
    "str\\.first\\s*(\?=\\()": "custom-native-function",
    "str\\.last\\s*(\?=\\()": "custom-native-function",
    "str\\.init\\s*(\?=\\()": "custom-native-function",
    "str\\.tail\\s*(\?=\\()": "custom-native-function",
    "str\\.at\\s*(\?=\\()": "custom-native-function",
    "str\\.isEmpty\\s*(\?=\\()": "custom-native-function",
    "str\\.isNotEmpty\\s*(\?=\\()": "custom-native-function",
    "str\\.contains\\s*(\?=\\()": "custom-native-function",
    "str\\.take\\s*(\?=\\()": "custom-native-function",
    "str\\.drop\\s*(\?=\\()": "custom-native-function",
    "str\\.remove\\s*(\?=\\()": "custom-native-function",
    "str\\.reverse\\s*(\?=\\()": "custom-native-function",
    "str\\.bytes\\s*(\?=\\()": "custom-native-function",
    "str\\.indexOf\\s*(\?=\\()": "custom-native-function",
    "str\\.padLeft\\s*(\?=\\()": "custom-native-function",
    "str\\.padRight\\s*(\?=\\()": "custom-native-function",
    "str\\.split\\s*(\?=\\()": "custom-native-function",
    "str\\.compare\\s*(\?=\\()": "custom-native-function",

    // list
    "list\\.sublist\\s*(?=\\()": "custom-native-function",
    "list\\.at\\s*(?=\\()": "custom-native-function",
    "list\\.set\\s*(?=\\()": "custom-native-function",
    "list\\.join\\s*(?=\\()": "custom-native-function",
    "list\\.length\\s*(?=\\()": "custom-native-function",
    "list\\.concat\\s*(?=\\()": "custom-native-function",
    "list\\.isEmpty\\s*(?=\\()": "custom-native-function",
    "list\\.isNotEmpty\\s*(?=\\()": "custom-native-function",
    "list\\.contains\\s*(?=\\()": "custom-native-function",
    "list\\.first\\s*(?=\\()": "custom-native-function",
    "list\\.last\\s*(?=\\()": "custom-native-function",
    "list\\.init\\s*(?=\\()": "custom-native-function",
    "list\\.tail\\s*(?=\\()": "custom-native-function",
    "list\\.take\\s*(?=\\()": "custom-native-function",
    "list\\.drop\\s*(?=\\()": "custom-native-function",
    "list\\.insertStart\\s*(?=\\()": "custom-native-function",
    "list\\.insertEnd\\s*(?=\\()": "custom-native-function",
    "list\\.remove\\s*(?=\\()": "custom-native-function",
    "list\\.removeAt\\s*(?=\\()": "custom-native-function",
    "list\\.reverse\\s*(?=\\()": "custom-native-function",
    "list\\.filled\\s*(?=\\()": "custom-native-function",
    "list\\.indexOf\\s*(?=\\()": "custom-native-function",
    "list\\.swap\\s*(?=\\()": "custom-native-function",
    "list\\.map\\s*(?=\\()": "custom-native-function",
    "list\\.filter\\s*(?=\\()": "custom-native-function",
    "list\\.reduce\\s*(?=\\()": "custom-native-function",
    "list\\.all\\s*(?=\\()": "custom-native-function",
    "list\\.none\\s*(?=\\()": "custom-native-function",
    "list\\.any\\s*(?=\\()": "custom-native-function",
    "list\\.zip\\s*(?=\\()": "custom-native-function",
    "list\\.sort\\s*(?=\\()": "custom-native-function",

    // map
    "map\\.at\\s*(?=\\()": "custom-native-function",
    "map\\.set\\s*(?=\\()": "custom-native-function",
    "map\\.keys\\s*(?=\\()": "custom-native-function",
    "map\\.values\\s*(?=\\()": "custom-native-function",
    "map\\.containsKey\\s*(?=\\()": "custom-native-function",
    "map\\.isEmpty\\s*(?=\\()": "custom-native-function",
    "map\\.isNotEmpty\\s*(?=\\()": "custom-native-function",
    "map\\.removeAt\\s*(?=\\()": "custom-native-function",
    "map\\.length\\s*(?=\\()": "custom-native-function",

    // casting
    "to\\.number\\s*(\?=\\()": "custom-native-function",
    "to\\.integer\\s*(\?=\\()": "custom-native-function",
    "to\\.decimal\\s*(\?=\\()": "custom-native-function",
    "to\\.string\\s*(\?=\\()": "custom-native-function",
    "to\\.boolean\\s*(\?=\\()": "custom-native-function",

    // checking
    "is\\.number\\s*(\?=\\()": "custom-native-function",
    "is\\.integer\\s*(\?=\\()": "custom-native-function",
    "is\\.decimal\\s*(\?=\\()": "custom-native-function",
    "is\\.infinite\\s*(\?=\\()": "custom-native-function",
    "is\\.string\\s*(\?=\\()": "custom-native-function",
    "is\\.boolean\\s*(\?=\\()": "custom-native-function",
    "is\\.list\\s*(\?=\\()": "custom-native-function",
    "is\\.map\\s*(\?=\\()": "custom-native-function",

    // json
    "json\\.encode\\s*(\?=\\()": "custom-native-function",
    "json\\.decode\\s*(\?=\\()": "custom-native-function",

    // console
    "console\\.write\\s*(\?=\\()": "custom-native-function",
    "console\\.writeLn\\s*(\?=\\()": "custom-native-function",
    "console\\.read\\s*(\?=\\()": "custom-native-function",
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