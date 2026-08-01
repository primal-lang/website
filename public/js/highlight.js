function setSampleCode(id, content) {
  document.addEventListener("DOMContentLoaded", function () {
    window.editor = CodeMirror(document.getElementById(id), {
      ...basicProperties(true),
      lineNumbers: false,
      value: content,
      readOnly: true,
    });
  });
}

// Code samples are rendered by CodeMirror after the document is parsed, which pushes
// any deep-link target far down the page after the browser has already jumped to it.
// Re-align once every sample has its final height.
window.addEventListener("load", function () {
  if (!location.hash) {
    return;
  }

  let target;

  try {
    target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  } catch (e) {
    return;
  }

  if (!target) {
    return;
  }

  const box = target.getBoundingClientRect();

  // Leaves the page alone if the reader is already looking at the target.
  if (box.top < 0 || box.top >= window.innerHeight) {
    target.scrollIntoView();
  }
});

const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
const COPIED_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
const COPY_FAILED_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

// The icon carries the outcome visually and the label carries it to assistive
// technology, so neither state depends on colour alone.
function setCopyButtonState(button, styleClass, icon, label) {
  button.classList.remove("copied", "copy-failed");

  if (styleClass) {
    button.classList.add(styleClass);
  }

  button.innerHTML = icon;
  button.setAttribute("aria-label", label);
}

function flashCopyButtonState(button, styleClass, icon, label) {
  setCopyButtonState(button, styleClass, icon, label);

  setTimeout(function () {
    setCopyButtonState(button, null, COPY_ICON, "Copy code");
  }, 2000);
}

// Add copy buttons to all code-sample elements
document.addEventListener("DOMContentLoaded", function () {
  const codeSamples = document.querySelectorAll(".code-sample");

  codeSamples.forEach(function (sample) {
    const copyBtn = document.createElement("button");
    copyBtn.className = "code-copy-btn";
    copyBtn.type = "button";
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.innerHTML = COPY_ICON;

    copyBtn.addEventListener("click", function () {
      // Try to get content from CodeMirror instance
      const cmElement = sample.querySelector(".CodeMirror");
      let text = "";

      if (cmElement && cmElement.CodeMirror) {
        text = cmElement.CodeMirror.getValue();
      } else {
        // Fallback to text content
        text = sample.textContent || sample.innerText;
      }

      // The Clipboard API is missing outside secure contexts and can reject even
      // where it exists, so the tick only appears once the copy has succeeded.
      if (!navigator.clipboard) {
        flashCopyButtonState(copyBtn, "copy-failed", COPY_FAILED_ICON, "Copy failed");

        return;
      }

      navigator.clipboard
        .writeText(text)
        .then(function () {
          flashCopyButtonState(copyBtn, "copied", COPIED_ICON, "Code copied");
        })
        .catch(function () {
          flashCopyButtonState(copyBtn, "copy-failed", COPY_FAILED_ICON, "Copy failed");
        });
    });

    sample.appendChild(copyBtn);
  });
});

// https://github.com/erosman/CodeMirror-plus/tree/main/addon/mode
(function (mod) {
  if (typeof exports == "object" && typeof module == "object")
    // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    // AMD
    define(["../../lib/codemirror"], mod); // Plain browser env
  else mod(CodeMirror);
})(function (CodeMirror) {
  CodeMirror.defineOption("keyword", {}, function (cm, val, prev) {
    if (prev == CodeMirror.Init) prev = false;
    if (prev && !val) cm.removeOverlay("keyword");
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
        name: "keyword",
      });
  });
});

const basicProperties = (withExtras) => {
  const extras = {
    Boolean: "custom-type",
    Number: "custom-type",
    String: "custom-type",
    Timestamp: "custom-type",
    Duration: "custom-type",
    List: "custom-type",
    Map: "custom-type",
    Set: "custom-type",
    Stack: "custom-type",
    Queue: "custom-type",
    Vector: "custom-type",
    File: "custom-type",
    Directory: "custom-type",
    Function: "custom-type",
    HttpResponse: "custom-type",
    Error: "custom-type",
    Any: "custom-type",
    Equatable: "custom-type",
    Hashable: "custom-type",
    Ordered: "custom-type",

    // main
    "main\\s": "custom-keyword",

    // control
    "if\\s*": "custom-keyword",
    "else\\s*": "custom-keyword",
    "and\\s*": "custom-keyword",
    "or\\s*": "custom-keyword",
    "try\\s*(\?=\\()": "custom-native-function",

    // error
    "error_throw\\s*(\?=\\()": "custom-native-function",

    // assert
    "assert_equal\\s*(\?=\\()": "custom-native-function",
    "assert_notEqual\\s*(\?=\\()": "custom-native-function",
    "assert_true\\s*(\?=\\()": "custom-native-function",
    "assert_false\\s*(\?=\\()": "custom-native-function",
    "assert_throws\\s*(\?=\\()": "custom-native-function",

    // comparison
    "comp_eq\\s*(\?=\\()": "custom-native-function",
    "comp_neq\\s*(\?=\\()": "custom-native-function",
    "comp_gt\\s*(\?=\\()": "custom-native-function",
    "comp_lt\\s*(\?=\\()": "custom-native-function",
    "comp_ge\\s*(\?=\\()": "custom-native-function",
    "comp_le\\s*(\?=\\()": "custom-native-function",

    // arithmetic
    "num_abs\\s*(\?=\\()": "custom-native-function",
    "num_negative\\s*(\?=\\()": "custom-native-function",
    "num_inc\\s*(\?=\\()": "custom-native-function",
    "num_dec\\s*(\?=\\()": "custom-native-function",
    "num_add\\s*(\?=\\()": "custom-native-function",
    "num_sum\\s*(\?=\\()": "custom-native-function",
    "num_sub\\s*(\?=\\()": "custom-native-function",
    "num_mul\\s*(\?=\\()": "custom-native-function",
    "num_div\\s*(\?=\\()": "custom-native-function",
    "num_mod\\s*(\?=\\()": "custom-native-function",
    "num_pow\\s*(\?=\\()": "custom-native-function",
    "num_sqrt\\s*(\?=\\()": "custom-native-function",
    "num_min\\s*(\?=\\()": "custom-native-function",
    "num_max\\s*(\?=\\()": "custom-native-function",
    "num_round\\s*(\?=\\()": "custom-native-function",
    "num_floor\\s*(\?=\\()": "custom-native-function",
    "num_ceil\\s*(\?=\\()": "custom-native-function",
    "num_truncate\\s*(\?=\\()": "custom-native-function",
    "num_roundTo\\s*(\?=\\()": "custom-native-function",
    "num_sin\\s*(\?=\\()": "custom-native-function",
    "num_cos\\s*(\?=\\()": "custom-native-function",
    "num_tan\\s*(\?=\\()": "custom-native-function",
    "num_log\\s*(\?=\\()": "custom-native-function",
    "num_logBase\\s*(\?=\\()": "custom-native-function",
    "num_isNegative\\s*(\?=\\()": "custom-native-function",
    "num_isPositive\\s*(\?=\\()": "custom-native-function",
    "num_isZero\\s*(\?=\\()": "custom-native-function",
    "num_isEven\\s*(\?=\\()": "custom-native-function",
    "num_isOdd\\s*(\?=\\()": "custom-native-function",
    "num_asRadians\\s*(\?=\\()": "custom-native-function",
    "num_asDegrees\\s*(\?=\\()": "custom-native-function",
    "num_infinity\\s*(\?=\\()": "custom-native-function",
    "num_fraction\\s*(\?=\\()": "custom-native-function",
    "num_clamp\\s*(\?=\\()": "custom-native-function",
    "num_sign\\s*(\?=\\()": "custom-native-function",
    "num_integerRandom\\s*(\?=\\()": "custom-native-function",
    "num_decimalRandom\\s*(\?=\\()": "custom-native-function",
    "num_compare\\s*(\?=\\()": "custom-native-function",

    // logic
    "bool_and\\s*(\?=\\()": "custom-native-function",
    "bool_andStrict\\s*(\?=\\()": "custom-native-function",
    "bool_or\\s*(\?=\\()": "custom-native-function",
    "bool_orStrict\\s*(\?=\\()": "custom-native-function",
    "bool_xor\\s*(\?=\\()": "custom-native-function",
    "bool_not\\s*(\?=\\()": "custom-native-function",

    // string
    "str_substring\\s*(\?=\\()": "custom-native-function",
    "str_startsWith\\s*(\?=\\()": "custom-native-function",
    "str_endsWith\\s*(\?=\\()": "custom-native-function",
    "str_replace\\s*(\?=\\()": "custom-native-function",
    "str_uppercase\\s*(\?=\\()": "custom-native-function",
    "str_lowercase\\s*(\?=\\()": "custom-native-function",
    "str_trim\\s*(\?=\\()": "custom-native-function",
    "str_match\\s*(\?=\\()": "custom-native-function",
    "str_length\\s*(\?=\\()": "custom-native-function",
    "str_concat\\s*(\?=\\()": "custom-native-function",
    "str_first\\s*(\?=\\()": "custom-native-function",
    "str_last\\s*(\?=\\()": "custom-native-function",
    "str_init\\s*(\?=\\()": "custom-native-function",
    "str_rest\\s*(\?=\\()": "custom-native-function",
    "str_at\\s*(\?=\\()": "custom-native-function",
    "str_isEmpty\\s*(\?=\\()": "custom-native-function",
    "str_isNotEmpty\\s*(\?=\\()": "custom-native-function",
    "str_contains\\s*(\?=\\()": "custom-native-function",
    "str_take\\s*(\?=\\()": "custom-native-function",
    "str_drop\\s*(\?=\\()": "custom-native-function",
    "str_removeAt\\s*(\?=\\()": "custom-native-function",
    "str_reverse\\s*(\?=\\()": "custom-native-function",
    "str_bytes\\s*(\?=\\()": "custom-native-function",
    "str_indexOf\\s*(\?=\\()": "custom-native-function",
    "str_padLeft\\s*(\?=\\()": "custom-native-function",
    "str_padRight\\s*(\?=\\()": "custom-native-function",
    "str_split\\s*(\?=\\()": "custom-native-function",
    "str_compare\\s*(\?=\\()": "custom-native-function",
    "str_trimLeft\\s*(\?=\\()": "custom-native-function",
    "str_trimRight\\s*(\?=\\()": "custom-native-function",
    "str_capitalize\\s*(\?=\\()": "custom-native-function",
    "str_repeat\\s*(\?=\\()": "custom-native-function",
    "str_lines\\s*(\?=\\()": "custom-native-function",
    "str_lastIndexOf\\s*(\?=\\()": "custom-native-function",
    "str_count\\s*(\?=\\()": "custom-native-function",
    "str_isBlank\\s*(\?=\\()": "custom-native-function",
    "str_isUppercase\\s*(\?=\\()": "custom-native-function",
    "str_isLowercase\\s*(\?=\\()": "custom-native-function",
    "str_isAlpha\\s*(\?=\\()": "custom-native-function",
    "str_isNumeric\\s*(\?=\\()": "custom-native-function",
    "str_isAlphaNumeric\\s*(\?=\\()": "custom-native-function",
    "str_fromBytes\\s*(\?=\\()": "custom-native-function",

    // list
    "list_sublist\\s*(?=\\()": "custom-native-function",
    "list_at\\s*(?=\\()": "custom-native-function",
    "list_set\\s*(?=\\()": "custom-native-function",
    "list_join\\s*(?=\\()": "custom-native-function",
    "list_length\\s*(?=\\()": "custom-native-function",
    "list_concat\\s*(?=\\()": "custom-native-function",
    "list_isEmpty\\s*(?=\\()": "custom-native-function",
    "list_isNotEmpty\\s*(?=\\()": "custom-native-function",
    "list_contains\\s*(?=\\()": "custom-native-function",
    "list_first\\s*(?=\\()": "custom-native-function",
    "list_last\\s*(?=\\()": "custom-native-function",
    "list_init\\s*(?=\\()": "custom-native-function",
    "list_rest\\s*(?=\\()": "custom-native-function",
    "list_take\\s*(?=\\()": "custom-native-function",
    "list_drop\\s*(?=\\()": "custom-native-function",
    "list_insertStart\\s*(?=\\()": "custom-native-function",
    "list_insertEnd\\s*(?=\\()": "custom-native-function",
    "list_remove\\s*(?=\\()": "custom-native-function",
    "list_removeAt\\s*(?=\\()": "custom-native-function",
    "list_reverse\\s*(?=\\()": "custom-native-function",
    "list_filled\\s*(?=\\()": "custom-native-function",
    "list_indexOf\\s*(?=\\()": "custom-native-function",
    "list_swap\\s*(?=\\()": "custom-native-function",
    "list_map\\s*(?=\\()": "custom-native-function",
    "list_filter\\s*(?=\\()": "custom-native-function",
    "list_reduce\\s*(?=\\()": "custom-native-function",
    "list_all\\s*(?=\\()": "custom-native-function",
    "list_none\\s*(?=\\()": "custom-native-function",
    "list_any\\s*(?=\\()": "custom-native-function",
    "list_zip\\s*(?=\\()": "custom-native-function",
    "list_sort\\s*(?=\\()": "custom-native-function",
    "list_flatten\\s*(?=\\()": "custom-native-function",
    "list_distinct\\s*(?=\\()": "custom-native-function",
    "list_chunk\\s*(?=\\()": "custom-native-function",
    "list_count\\s*(?=\\()": "custom-native-function",

    // map
    "map_at\\s*(?=\\()": "custom-native-function",
    "map_set\\s*(?=\\()": "custom-native-function",
    "map_keys\\s*(?=\\()": "custom-native-function",
    "map_values\\s*(?=\\()": "custom-native-function",
    "map_containsKey\\s*(?=\\()": "custom-native-function",
    "map_isEmpty\\s*(?=\\()": "custom-native-function",
    "map_isNotEmpty\\s*(?=\\()": "custom-native-function",
    "map_removeAt\\s*(?=\\()": "custom-native-function",
    "map_length\\s*(?=\\()": "custom-native-function",
    "map_entries\\s*(?=\\()": "custom-native-function",
    "map_merge\\s*(?=\\()": "custom-native-function",

    // set
    "set_new\\s*(?=\\()": "custom-native-function",
    "set_add\\s*(?=\\()": "custom-native-function",
    "set_remove\\s*(?=\\()": "custom-native-function",
    "set_contains\\s*(?=\\()": "custom-native-function",
    "set_isEmpty\\s*(?=\\()": "custom-native-function",
    "set_isNotEmpty\\s*(?=\\()": "custom-native-function",
    "set_length\\s*(?=\\()": "custom-native-function",
    "set_union\\s*(?=\\()": "custom-native-function",
    "set_intersection\\s*(?=\\()": "custom-native-function",
    "set_difference\\s*(?=\\()": "custom-native-function",
    "set_isDisjoint\\s*(?=\\()": "custom-native-function",
    "set_isSubset\\s*(?=\\()": "custom-native-function",
    "set_isSuperset\\s*(?=\\()": "custom-native-function",

    // stack
    "stack_new\\s*(?=\\()": "custom-native-function",
    "stack_push\\s*(?=\\()": "custom-native-function",
    "stack_pop\\s*(?=\\()": "custom-native-function",
    "stack_peek\\s*(?=\\()": "custom-native-function",
    "stack_isEmpty\\s*(?=\\()": "custom-native-function",
    "stack_isNotEmpty\\s*(?=\\()": "custom-native-function",
    "stack_length\\s*(?=\\()": "custom-native-function",
    "stack_reverse\\s*(?=\\()": "custom-native-function",

    // queue
    "queue_new\\s*(?=\\()": "custom-native-function",
    "queue_enqueue\\s*(?=\\()": "custom-native-function",
    "queue_dequeue\\s*(?=\\()": "custom-native-function",
    "queue_peek\\s*(?=\\()": "custom-native-function",
    "queue_isEmpty\\s*(?=\\()": "custom-native-function",
    "queue_isNotEmpty\\s*(?=\\()": "custom-native-function",
    "queue_length\\s*(?=\\()": "custom-native-function",
    "queue_reverse\\s*(?=\\()": "custom-native-function",

    // vector
    "vector_new\\s*(?=\\()": "custom-native-function",
    "vector_normalize\\s*(?=\\()": "custom-native-function",
    "vector_add\\s*(?=\\()": "custom-native-function",
    "vector_sub\\s*(?=\\()": "custom-native-function",
    "vector_magnitude\\s*(?=\\()": "custom-native-function",
    "vector_angle\\s*(?=\\()": "custom-native-function",
    "vector_scale\\s*(?=\\()": "custom-native-function",
    "vector_dot\\s*(?=\\()": "custom-native-function",
    "vector_distance\\s*(?=\\()": "custom-native-function",

    // file
    "file_fromPath\\s*(?=\\()": "custom-native-function",
    "file_exists\\s*(?=\\()": "custom-native-function",
    "file_read\\s*(?=\\()": "custom-native-function",
    "file_write\\s*(?=\\()": "custom-native-function",
    "file_length\\s*(?=\\()": "custom-native-function",
    "file_create\\s*(?=\\()": "custom-native-function",
    "file_delete\\s*(?=\\()": "custom-native-function",
    "file_path\\s*(?=\\()": "custom-native-function",
    "file_name\\s*(?=\\()": "custom-native-function",
    "file_extension\\s*(?=\\()": "custom-native-function",
    "file_copy\\s*(?=\\()": "custom-native-function",
    "file_move\\s*(?=\\()": "custom-native-function",
    "file_parent\\s*(?=\\()": "custom-native-function",
    "file_rename\\s*(?=\\()": "custom-native-function",
    "file_append\\s*(?=\\()": "custom-native-function",
    "file_lastModified\\s*(?=\\()": "custom-native-function",

    // directory
    "directory_fromPath\\s*(?=\\()": "custom-native-function",
    "directory_exists\\s*(?=\\()": "custom-native-function",
    "directory_create\\s*(?=\\()": "custom-native-function",
    "directory_delete\\s*(?=\\()": "custom-native-function",
    "directory_copy\\s*(?=\\()": "custom-native-function",
    "directory_move\\s*(?=\\()": "custom-native-function",
    "directory_rename\\s*(?=\\()": "custom-native-function",
    "directory_path\\s*(?=\\()": "custom-native-function",
    "directory_name\\s*(?=\\()": "custom-native-function",
    "directory_parent\\s*(?=\\()": "custom-native-function",
    "directory_list\\s*(?=\\()": "custom-native-function",

    // path
    "path_basename\\s*(?=\\()": "custom-native-function",
    "path_dirname\\s*(?=\\()": "custom-native-function",
    "path_extension\\s*(?=\\()": "custom-native-function",
    "path_isAbsolute\\s*(?=\\()": "custom-native-function",
    "path_join\\s*(?=\\()": "custom-native-function",
    "path_normalize\\s*(?=\\()": "custom-native-function",

    // casting
    "to_number\\s*(\?=\\()": "custom-native-function",
    "to_integer\\s*(\?=\\()": "custom-native-function",
    "to_decimal\\s*(\?=\\()": "custom-native-function",
    "to_string\\s*(\?=\\()": "custom-native-function",
    "to_boolean\\s*(\?=\\()": "custom-native-function",
    "to_list\\s*(\?=\\()": "custom-native-function",

    // checking
    "is_number\\s*(\?=\\()": "custom-native-function",
    "is_integer\\s*(\?=\\()": "custom-native-function",
    "is_decimal\\s*(\?=\\()": "custom-native-function",
    "is_infinite\\s*(\?=\\()": "custom-native-function",
    "is_string\\s*(\?=\\()": "custom-native-function",
    "is_boolean\\s*(\?=\\()": "custom-native-function",
    "is_timestamp\\s*(\?=\\()": "custom-native-function",
    "is_function\\s*(\?=\\()": "custom-native-function",
    "is_list\\s*(\?=\\()": "custom-native-function",
    "is_map\\s*(\?=\\()": "custom-native-function",
    "is_vector\\s*(\?=\\()": "custom-native-function",
    "is_set\\s*(\?=\\()": "custom-native-function",
    "is_stack\\s*(\?=\\()": "custom-native-function",
    "is_queue\\s*(\?=\\()": "custom-native-function",
    "is_file\\s*(\?=\\()": "custom-native-function",
    "is_directory\\s*(\?=\\()": "custom-native-function",
    "is_duration\\s*(\?=\\()": "custom-native-function",

    // introspection
    "type_of\\s*(\?=\\()": "custom-native-function",
    "function_name\\s*(\?=\\()": "custom-native-function",
    "function_arity\\s*(\?=\\()": "custom-native-function",
    "function_parameters\\s*(\?=\\()": "custom-native-function",

    // json
    "json_encode\\s*(\?=\\()": "custom-native-function",
    "json_decode\\s*(\?=\\()": "custom-native-function",

    // hash
    "hash_md5\\s*(\?=\\()": "custom-native-function",
    "hash_sha1\\s*(\?=\\()": "custom-native-function",
    "hash_sha256\\s*(\?=\\()": "custom-native-function",
    "hash_sha512\\s*(\?=\\()": "custom-native-function",

    // base64
    "base64_encode\\s*(\?=\\()": "custom-native-function",
    "base64_decode\\s*(\?=\\()": "custom-native-function",

    // uuid
    "uuid_v4\\s*(\?=\\()": "custom-native-function",

    // timestamp
    "time_now\\s*(\?=\\()": "custom-native-function",
    "time_toIso\\s*(\?=\\()": "custom-native-function",
    "time_fromIso\\s*(\?=\\()": "custom-native-function",
    "time_year\\s*(\?=\\()": "custom-native-function",
    "time_month\\s*(\?=\\()": "custom-native-function",
    "time_day\\s*(\?=\\()": "custom-native-function",
    "time_hour\\s*(\?=\\()": "custom-native-function",
    "time_minute\\s*(\?=\\()": "custom-native-function",
    "time_second\\s*(\?=\\()": "custom-native-function",
    "time_millisecond\\s*(\?=\\()": "custom-native-function",
    "time_toEpoch\\s*(\?=\\()": "custom-native-function",
    "time_fromEpoch\\s*(\?=\\()": "custom-native-function",
    "time_format\\s*(\?=\\()": "custom-native-function",
    "time_dayOfWeek\\s*(\?=\\()": "custom-native-function",
    "time_dayOfYear\\s*(\?=\\()": "custom-native-function",
    "time_compare\\s*(\?=\\()": "custom-native-function",
    "time_isBefore\\s*(\?=\\()": "custom-native-function",
    "time_isAfter\\s*(\?=\\()": "custom-native-function",
    "time_add\\s*(\?=\\()": "custom-native-function",
    "time_subtract\\s*(\?=\\()": "custom-native-function",
    "time_between\\s*(\?=\\()": "custom-native-function",
    "time_isLeapYear\\s*(\?=\\()": "custom-native-function",

    // duration
    "duration_fromMilliseconds\\s*(\?=\\()": "custom-native-function",
    "duration_fromSeconds\\s*(\?=\\()": "custom-native-function",
    "duration_fromMinutes\\s*(\?=\\()": "custom-native-function",
    "duration_fromHours\\s*(\?=\\()": "custom-native-function",
    "duration_fromDays\\s*(\?=\\()": "custom-native-function",
    "duration_from\\s*(\?=\\()": "custom-native-function",
    "duration_toMilliseconds\\s*(\?=\\()": "custom-native-function",
    "duration_toSeconds\\s*(\?=\\()": "custom-native-function",
    "duration_toMinutes\\s*(\?=\\()": "custom-native-function",
    "duration_toHours\\s*(\?=\\()": "custom-native-function",
    "duration_toDays\\s*(\?=\\()": "custom-native-function",
    "duration_milliseconds\\s*(\?=\\()": "custom-native-function",
    "duration_seconds\\s*(\?=\\()": "custom-native-function",
    "duration_minutes\\s*(\?=\\()": "custom-native-function",
    "duration_hours\\s*(\?=\\()": "custom-native-function",
    "duration_days\\s*(\?=\\()": "custom-native-function",
    "duration_compare\\s*(\?=\\()": "custom-native-function",
    "duration_format\\s*(\?=\\()": "custom-native-function",

    // console
    "console_write\\s*(\?=\\()": "custom-native-function",
    "console_writeLn\\s*(\?=\\()": "custom-native-function",
    "console_read\\s*(\?=\\()": "custom-native-function",

    // debug
    "debug\\s*(\?=\\()": "custom-native-function",

    // environment
    "env_get\\s*(\?=\\()": "custom-native-function",
    "env_has\\s*(\?=\\()": "custom-native-function",
  };

  return {
    mode: "javascript",
    theme: "dracula",
    keyword: {
      "\\(": "custom-parenthesis",
      "\\)": "custom-parenthesis",
      "\\[": "custom-parenthesis",
      "\\]": "custom-parenthesis",
      "\\{": "custom-parenthesis",
      "\\}": "custom-parenthesis",

      "=": "custom-marker",

      ...(withExtras && extras),
    },
  };
};
