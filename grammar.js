/**
 * @file Mustache + Handlebars templates (a superset grammar for both).
 *
 * Only the `{{…}}` tags are parsed. Everything between them is `content`,
 * which editors inject as HTML (combined), so mustache inside HTML start tags
 * and attribute values never breaks the parse.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Handlebars ID: anything except whitespace and these characters:
//   ! " # % & ' ( ) * + , . / ; < = > @ [ \ ] ^ ` { | } ~
const IDENTIFIER = /[^\s!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/;

const escape = (s) => s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

// Opening delimiters, with optional `~` whitespace control and (as
// mustache.php allows) whitespace before the sigil: `{{#`, `{{~#`, `{{ #`.
// Each is one token, aliased to its canonical spelling for queries.
const open = (sigil) =>
  alias(
    token(new RegExp(`\\{\\{~?${sigil ? `\\s*${escape(sigil)}` : ''}`)),
    `{{${sigil}`,
  );
const CLOSE = alias(token(/~?\}\}/), '}}');

module.exports = grammar({
  name: 'mustache',

  externals: ($) => [
    $.comment,
    // `{{` / `{{~` when followed by `else` or `^}}`; zero-width lookahead in
    // the scanner keeps `{{else}}` from being confused with a plain tag.
    $._else_open,
  ],

  extras: () => [/\s/],

  word: ($) => $.identifier,

  rules: {
    template: ($) => repeat($._node),

    _node: ($) =>
      choice(
        $.content,
        $.comment,
        $.mustache_statement,
        $.unescaped_statement,
        $.partial_statement,
        $.block,
      ),

    content: () => prec.right(repeat1(choice(/[^{]+/, '{'))),

    // {{expr}} / {{helper arg key=value}}
    mustache_statement: ($) => seq(open(''), $._call, CLOSE),

    // {{{expr}}} / {{&expr}}
    unescaped_statement: ($) =>
      choice(
        seq(
          alias(token(/\{\{\{~?/), '{{{'),
          $._call,
          alias(token(/~?\}\}\}/), '}}}'),
        ),
        seq(open('&'), $._call, CLOSE),
      ),

    // {{> partial-name arg key=value}}
    partial_statement: ($) =>
      seq(
        open('>'),
        field('name', $._partial_name),
        repeat($._argument),
        CLOSE,
      ),

    _partial_name: ($) => choice($.path_expression, $.sub_expression, $.string),

    // {{#name …}} … {{else …}} … {{/name}}
    // {{^name}} … {{/name}}
    // {{#> partial}} … {{/partial}}, {{#*inline "x"}} … {{/inline}}
    // {{$block}} … {{/block}}, {{<parent}} … {{/parent}}  (mustache inheritance)
    block: ($) =>
      seq(
        field('open', choice($.block_start, $.inverted_block_start)),
        field('body', alias(repeat($._node), $.program)),
        repeat(field('alternative', $.else_clause)),
        field('close', $.block_end),
      ),

    block_start: ($) =>
      seq(
        choice(open('#'), open('#>'), open('#*'), open('$'), open('<')),
        field('name', $._block_name),
        repeat($._argument),
        optional($.block_params),
        CLOSE,
      ),

    inverted_block_start: ($) =>
      seq(
        open('^'),
        field('name', $._block_name),
        repeat($._argument),
        optional($.block_params),
        CLOSE,
      ),

    _block_name: ($) => choice($.path_expression, $.sub_expression, $.string),

    block_end: ($) => seq(open('/'), field('name', $._block_name), CLOSE),

    else_clause: ($) =>
      prec.right(seq($.else_statement, alias(repeat($._node), $.program))),

    // {{else}} / {{else if cond}} / {{^}}
    else_statement: ($) =>
      seq(
        alias($._else_open, '{{'),
        choice(
          seq(
            'else',
            optional(
              seq(
                field('name', $.path_expression),
                repeat($._argument),
                optional($.block_params),
              ),
            ),
          ),
          '^',
        ),
        CLOSE,
      ),

    // ---- expressions -------------------------------------------------------

    _call: ($) => choice($._expression, $.helper_invocation),

    helper_invocation: ($) =>
      seq(field('helper', $.path_expression), repeat1($._argument)),

    _argument: ($) => choice(field('argument', $._expression), $.hash_pair),

    _expression: ($) =>
      choice(
        $.path_expression,
        $.sub_expression,
        $.string,
        $.number,
        $.boolean,
        $.null,
        $.undefined,
      ),

    sub_expression: ($) =>
      seq(
        '(',
        choice(
          seq(field('helper', $.path_expression), repeat($._argument)),
          $.sub_expression,
        ),
        ')',
      ),

    hash_pair: ($) =>
      seq(
        field('key', choice($.identifier, $.segment_literal)),
        token.immediate('='),
        field('value', $._expression),
      ),

    block_params: ($) => seq('as', '|', repeat1($.identifier), '|'),

    // foo, foo.bar, foo/bar, this, this.foo, ., ./foo, ../foo, @index,
    // @root.foo, foo.[weird key]
    path_expression: ($) =>
      seq(
        optional($.data),
        choice($.this, $.identifier, $.segment_literal, '..', '.'),
        repeat(
          seq(
            choice(token.immediate(prec(1, '.')), token.immediate(prec(1, '/'))),
            choice($.identifier, $.segment_literal, '..', $.this),
          ),
        ),
      ),

    data: () => '@',

    this: () => 'this',

    // Defined before `identifier` so an all-digit word lexes as a number
    // (same length → earlier rule wins), while `75x75` stays an identifier.
    number: () => /-?\d+(\.\d+)?/,

    identifier: () => IDENTIFIER,

    segment_literal: () => /\[[^\]]*\]/,

    string: () =>
      choice(/"(\\.|[^"\\])*"/, /'(\\.|[^'\\])*'/),

    boolean: () => choice('true', 'false'),

    null: () => 'null',

    undefined: () => 'undefined',
  },
});
