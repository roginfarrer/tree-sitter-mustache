#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
  COMMENT,
  ELSE_OPEN,
};

void *tree_sitter_mustache_external_scanner_create(void) { return NULL; }
void tree_sitter_mustache_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_mustache_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_mustache_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline bool is_space(int32_t c) { return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f'; }

static void skip_spaces(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) advance(lexer);
}

// After `{{!--`: consume through `--}}` or `--~}}`. If that never comes,
// fall back to the first `}}` (what mustache.php does), or end of file.
static void scan_long_comment(TSLexer *lexer) {
  bool saw_close = false;
  for (;;) {
    if (lexer->eof(lexer)) {
      if (!saw_close) lexer->mark_end(lexer);
      return;
    }
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (c == '}' && lexer->lookahead == '}' && !saw_close) {
      advance(lexer);
      lexer->mark_end(lexer);
      saw_close = true;
      continue;
    }
    if (c != '-' || lexer->lookahead != '-') continue;
    while (lexer->lookahead == '-') advance(lexer);
    if (lexer->lookahead == '~') advance(lexer);
    if (lexer->lookahead != '}') continue;
    advance(lexer);
    if (lexer->lookahead != '}') continue;
    advance(lexer);
    lexer->mark_end(lexer);
    return;
  }
}

// After `{{!`: consume through the first `}}`.
static void scan_short_comment(TSLexer *lexer) {
  for (;;) {
    if (lexer->eof(lexer)) break;
    if (lexer->lookahead != '}') {
      advance(lexer);
      continue;
    }
    advance(lexer);
    if (lexer->lookahead == '}') {
      advance(lexer);
      break;
    }
  }
  lexer->mark_end(lexer);
}

static bool matches_word(TSLexer *lexer, const char *word) {
  for (const char *c = word; *c; c++) {
    if (lexer->lookahead != *c) return false;
    advance(lexer);
  }
  return true;
}

bool tree_sitter_mustache_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  if (!valid_symbols[COMMENT] && !valid_symbols[ELSE_OPEN]) return false;

  // Leading whitespace belongs to `content`, so never skip it here.
  if (lexer->lookahead != '{') return false;
  advance(lexer);
  if (lexer->lookahead != '{') return false;
  advance(lexer);
  if (lexer->lookahead == '{') return false;  // `{{{` is an unescaped tag
  if (lexer->lookahead == '~') advance(lexer);

  // `{{else` is only `{{`/`{{~`; everything after this is lookahead.
  lexer->mark_end(lexer);
  skip_spaces(lexer);

  if (lexer->lookahead == '!') {
    if (!valid_symbols[COMMENT]) return false;
    advance(lexer);
    lexer->result_symbol = COMMENT;
    if (lexer->lookahead == '-') {
      advance(lexer);
      if (lexer->lookahead == '-') {
        advance(lexer);
        scan_long_comment(lexer);
        return true;
      }
    }
    scan_short_comment(lexer);
    return true;
  }

  if (!valid_symbols[ELSE_OPEN]) return false;
  lexer->result_symbol = ELSE_OPEN;

  if (lexer->lookahead == '^') {
    advance(lexer);
    skip_spaces(lexer);
    if (lexer->lookahead == '~') advance(lexer);
    return lexer->lookahead == '}';
  }

  if (!matches_word(lexer, "else")) return false;
  return is_space(lexer->lookahead) || lexer->lookahead == '~' || lexer->lookahead == '}';
}
