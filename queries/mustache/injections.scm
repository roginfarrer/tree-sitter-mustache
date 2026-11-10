; Everything outside {{…}} is HTML. Combined, so markup split by tags
; (e.g. `<a {{#x}}href="…"{{/x}}>`) is parsed as one HTML document.
((content) @injection.content
  (#set! injection.language "html")
  (#set! injection.combined))

((comment) @injection.content
  (#set! injection.language "comment"))
