; All patterns use priority 110 so mustache tags draw over the injected HTML
; (e.g. `{{href}}` inside an `href="…"` string, which HTML highlights as @string).

; Blocks (matches tree-sitter-glimmer) -------------------------------------
; The whole opening/closing/else tag is @tag.delimiter; the patterns below
; override the parts that have their own capture (names, arguments, …).

([
    (block_start)
    (inverted_block_start)
    (block_end)
    (else_statement)
  ] @tag.delimiter
  (#set! priority 110))

; Delimiters ----------------------------------------------------------------

([
    "{{"
    "}}"
    "{{{"
    "}}}"
    "{{#"
    "{{#>"
    "{{#*"
    "{{^"
    "{{/"
    "{{>"
    "{{&"
    "{{$"
    "{{<"
  ] @tag.delimiter
  (#set! priority 110))

([
    "("
    ")"
  ] @punctuation.bracket
  (#set! priority 110))

("=" @operator
  (#set! priority 110))

; Comments ------------------------------------------------------------------

((comment) @comment @spell
  (#set! priority 110))

; Literals ------------------------------------------------------------------

((string) @string
  (#set! priority 110))

((number) @number
  (#set! priority 110))

((boolean) @boolean
  (#set! priority 110))

([
    (null)
    (undefined)
  ] @constant.builtin
  (#set! priority 110))

; Paths ---------------------------------------------------------------------

((identifier) @variable
  (#set! priority 110))

((segment_literal) @variable
  (#set! priority 110))

((path_expression
    [
      "."
      ".."
      "/"
    ] @punctuation.delimiter)
  (#set! priority 110))

((this) @variable.builtin
  (#set! priority 110))

((data) @variable.builtin
  (#set! priority 110))

((path_expression
    (data)
    .
    (identifier) @variable.builtin)
  (#set! priority 110))

((hash_pair
    key: (_) @variable.parameter)
  (#set! priority 110))

((block_params
    "as" @keyword)
  (#set! priority 110))

((block_params
    (identifier) @variable)
  (#set! priority 110))

((block_params
    "|" @operator)
  (#set! priority 110))

; Helpers -------------------------------------------------------------------

((helper_invocation
    helper: (path_expression
      (identifier) @function.call))
  (#set! priority 110))

((sub_expression
    helper: (path_expression
      (identifier) @function.call))
  (#set! priority 110))

; Block names (`if`, `each`, `is_mobile`, …) are keywords, as in glimmer.
; Only a single-identifier name; dotted names (`features.modules`) stay @variable.
((block_start
    name: (path_expression
      .
      (identifier) @keyword.conditional
      .))
  (#set! priority 110))

((inverted_block_start
    name: (path_expression
      .
      (identifier) @keyword.conditional
      .))
  (#set! priority 110))

((block_end
    name: (path_expression
      .
      (identifier) @keyword.conditional
      .))
  (#set! priority 110))

((else_statement
    name: (path_expression
      .
      (identifier) @keyword.conditional
      .))
  (#set! priority 110))

((else_statement
    [
      "else"
      "^"
    ] @keyword.conditional)
  (#set! priority 110))

((helper_invocation
    helper: (path_expression
      (identifier) @function.builtin)
    (#any-of? @function.builtin "lookup" "log"))
  (#set! priority 110))

; Partials ------------------------------------------------------------------

((partial_statement
    name: (path_expression
      (identifier) @module))
  (#set! priority 110))

((partial_statement
    name: (path_expression
      "/" @module))
  (#set! priority 110))

((partial_statement
    name: (path_expression
      "." @module))
  (#set! priority 110))
