# textlint-plugin-typst

[![NPM Version](https://img.shields.io/npm/v/textlint-plugin-typst)](https://www.npmjs.com/package/textlint-plugin-typst?activeTab=versions)
[![NPM Downloads](https://img.shields.io/npm/d18m/textlint-plugin-typst)](https://www.npmjs.com/package/textlint-plugin-typst)
[![NPM License](https://img.shields.io/npm/l/textlint-plugin-typst)](https://github.com/3w36zj6/textlint-plugin-typst/blob/HEAD/LICENSE)
[![CI](https://github.com/3w36zj6/textlint-plugin-typst/actions/workflows/ci.yaml/badge.svg?branch=main&event=push)](https://github.com/3w36zj6/textlint-plugin-typst/actions/workflows/ci.yaml)

[textlint](https://github.com/textlint/textlint) plugin to lint [Typst](https://typst.app/)

## Installation

```sh
# npm
npm install textlint-plugin-typst

# Yarn
yarn add textlint-plugin-typst

# pnpm
pnpm add textlint-plugin-typst

# Bun
bun add textlint-plugin-typst
```

## Usage

```json
{
  "plugins": {
    "typst": true
  }
}
```

## Options

- `extensions`: `string[]`
  - Additional file extensions for Typst

## Syntax support

This plugin supports the syntax of Typst [v0.14.2](https://github.com/typst/typst/releases/tag/v0.14.2).

Legend for syntax support:

- ✅: Supported
- 🚫: Not in progress
- ⌛️: In progress
- ⚠️: Partially supported (with some caveats)

| Typst | textlint | Markup | Function |
| --- | --- | --- | --- |
| Paragraph break | Paragraph | ✅ | 🚫 |
| Strong emphasis | Strong | ✅ | 🚫 |
| Emphasis | Emphasis | ✅ | 🚫 |
| Raw text | Code / CodeBlock | ✅ | 🚫 |
| Link | Link | ✅ | 🚫 |
| Label | | 🚫 | 🚫 |
| Reference | | 🚫 | 🚫 |
| Heading | Header | ✅ | 🚫 |
| Bullet list | List / ListItem | ✅ | 🚫 |
| Numbered list | List / ListItem | ✅ | 🚫 |
| Term list | | 🚫 | 🚫 |
| Math | Code / CodeBlock | ✅ | 🚫 |
| Line break | Break | ✅ | 🚫 |
| Smart quote | | 🚫 | 🚫 |
| Symbol shorthand | | 🚫 | 🚫 |
| Code expression | | 🚫 | 🚫 |
| Character escape | | 🚫 | 🚫 |
| Comment | Comment | ✅ | 🚫 |

## Examples

### textlint-filter-rule-comments

Example of how to use [textlint-filter-rule-comments](https://www.npmjs.com/package/textlint-filter-rule-comments) is shown below.

```typst
This is error text.

/* textlint-disable */

This is ignored text by rule.
Disables all rules between comments

/* textlint-enable */

This is error text.
```

Also, you can use single-line comments.

```typst
This is error text.

// textlint-disable

This is ignored text by rule.
Disables all rules between comments

// textlint-enable

This is error text.
```

## Contributing

This project is still under development, so please feel free to contribute!

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Maintainers

- [@3w36zj6](https://github.com/3w36zj6)

## License

[MIT License](LICENSE)
