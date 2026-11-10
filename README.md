# tree-sitter-mustache

> [!NOTE]
> This grammar was written entirely by an AI coding agent, for my own editor setup. I'm sharing it in case it's useful to you too, but it's maintained on a best-effort basis.

A tree-sitter grammar for Mustache and Handlebars templates. It is one superset grammar for both.

It parses only the `{{…}}` tags. Everything between them is a `content` node, which the queries inject as **combined** HTML. Because the grammar never parses HTML, Mustache inside start tags or attribute values cannot break the parse:

```mustache
<a href="{{href}}" {{#target}}target="{{target}}"{{/target}}>…</a>
```

## Supported syntax

- Variables and paths: `{{name}}`, `{{a.b}}`, `{{a/b}}`, `{{../x}}`, `{{this.[weird key]}}`, `{{@index}}`, `{{.}}`
- Unescaped output: `{{{x}}}`, `{{& x}}`
- Helpers, hash arguments, and sub-expressions: `{{icon type="x" class=(classes [a b]=(not c))}}`
- Sections and blocks: `{{#x}}…{{/x}}`, `{{^x}}…{{/x}}`, `{{#if a}}…{{else if b}}…{{else}}…{{/if}}`, `{{^}}`, and `as |item i|`
- Partials: `{{> path/file.mustache arg=1}}`, `{{#> layout}}`, `{{#*inline "x"}}`
- Mustache inheritance: `{{<parent}}`, `{{$block}}`
- Comments: `{{! … }}` and `{{!-- … --}}`. A `{{!--` comment that has no closing `--}}` ends at the first `}}`, as it does in mustache.php.
- Whitespace control (`{{~ ~}}`) and whitespace before the sigil (`{{ > x }}`), which mustache.php accepts

Not supported: set-delimiter tags (`{{=<% %>=}}`) and raw blocks (`{{{{raw}}}}`).

## Development

```sh
tree-sitter generate && tree-sitter test
tree-sitter parse -p . path/to/file.mustache
```

## Neovim (nvim-treesitter `main` branch)

To use a local checkout instead, replace `url` with `path = '~/path/to/tree-sitter-mustache'`.

```lua
vim.api.nvim_create_autocmd('User', {
  pattern = 'TSUpdate',
  callback = function()
    require('nvim-treesitter.parsers').mustache = {
      install_info = { url = 'https://github.com/roginfarrer/tree-sitter-mustache', queries = 'queries/mustache' },
    }
  end,
})
vim.treesitter.language.register('mustache', { 'mustache', 'html.mustache', 'handlebars', 'html.handlebars' })
```

The install step copies the queries into Neovim's data directory. After you change `grammar.js` or a query, run `:TSInstall! mustache`.

nvim-treesitter also registers `glimmer` for `handlebars` when its plugin files load. To keep `mustache` for that filetype, register it again after that file runs, for example with a `SourcePost` autocmd on `*/nvim-treesitter/plugin/filetypes.lua`.
