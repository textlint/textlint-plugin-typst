import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
	convertRawTypstAstObjectToTextlintAstObject,
	convertRawTypstAstStringToObject,
	convertTypstSourceToTextlintAstObject,
	extractRawSourceByLocation,
	getRawTypstAstString,
} from "../src/getTypstAst";
import * as ASTTester from "@textlint/ast-tester";

const typstSource = `#set page(width: 10cm, height: auto)
#set heading(numbering: "1.")

= Fibonacci sequence
The Fibonacci sequence is defined through the
recurrence relation $F_n = F_(n-1) + F_(n-2)$.
It can also be expressed in _closed form:_

$ F_n = round(1 / sqrt(5) phi.alt^n), quad
  phi.alt = (1 + sqrt(5)) / 2 $

#let count = 8
#let nums = range(1, count + 1)
#let fib(n) = (
  if n <= 2 { 1 }
  else { fib(n - 1) + fib(n - 2) }
)

The first #count numbers of the sequence are:

#align(center, table(
  columns: count,
  ..nums.map(n => $F_#n$),
  ..nums.map(n => str(fib(n))),
))

// https://github.com/typst/typst/blob/main/README.md
`;

const rawTypstAstString = `---
path: main.typ
ast:
  s: <span style='color:#7dcfff'>Marked::Markup</span>
  c:
  - s: <span style='color:#bb9af7'>Kw::Hash</span> &lt;1:0~1:1&gt;
  - s: <span style='color:#7dcfff'>Marked::SetRule</span> &lt;1:1~1:36&gt;
    c:
    - s: <span style='color:#bb9af7'>Kw::Set</span> &lt;1:1~1:4&gt;
    - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;page&quot;)</span> &lt;1:5~1:9&gt;
    - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;1:9~1:36&gt;
      c:
      - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;1:9~1:10&gt;
      - s: <span style='color:#7dcfff'>Marked::Named</span> &lt;1:10~1:21&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;width&quot;)</span> &lt;1:10~1:15&gt;
        - s: <span style='color:#c0caf5'>Punc::Colon</span> &lt;1:15~1:16&gt;
        - s: <span style='color:#e08f68'>Num(Numeric, 10Cm)</span> &lt;1:17~1:21&gt;
      - s: <span style='color:#c0caf5'>Punc::Comma</span> &lt;1:21~1:22&gt;
      - s: <span style='color:#7dcfff'>Marked::Named</span> &lt;1:23~1:35&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;height&quot;)</span> &lt;1:23~1:29&gt;
        - s: <span style='color:#c0caf5'>Punc::Colon</span> &lt;1:29~1:30&gt;
        - s: <span style='color:#bb9af7'>Kw::Auto</span> &lt;1:31~1:35&gt;
      - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;1:35~1:36&gt;
  - s: <span style='color:#bb9af7'>Kw::Hash</span> &lt;2:0~2:1&gt;
  - s: <span style='color:#7dcfff'>Marked::SetRule</span> &lt;2:1~2:29&gt;
    c:
    - s: <span style='color:#bb9af7'>Kw::Set</span> &lt;2:1~2:4&gt;
    - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;heading&quot;)</span> &lt;2:5~2:12&gt;
    - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;2:12~2:29&gt;
      c:
      - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;2:12~2:13&gt;
      - s: <span style='color:#7dcfff'>Marked::Named</span> &lt;2:13~2:28&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;numbering&quot;)</span> &lt;2:13~2:22&gt;
        - s: <span style='color:#c0caf5'>Punc::Colon</span> &lt;2:22~2:23&gt;
        - s: <span style='color:#9ece6a'>Str(&quot;1.&quot;)</span> &lt;2:24~2:28&gt;
      - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;2:28~2:29&gt;
  - s: <span style='color:#7dcfff'>Marked::Parbreak</span> &lt;2:29~4:0&gt;
  - s: <span style='color:#7dcfff'>Marked::Heading</span> &lt;4:0~4:20&gt;
    c:
    - s: <span style='color:#7dcfff'>Marked::HeadingMarker</span> &lt;4:0~4:1&gt;
    - s: <span style='color:#7dcfff'>Marked::Markup</span> &lt;4:2~4:20&gt;
      c:
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;4:2~4:20&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;5:0~5:45&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:0~6:19&gt;
  - s: <span style='color:#7dcfff'>Marked::Equation</span> &lt;6:20~6:45&gt;
    c:
    - s: <span style='color:#7dcfff'>Marked::Dollar</span> &lt;6:20~6:21&gt;
    - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;6:21~6:44&gt;
      c:
      - s: <span style='color:#7dcfff'>Marked::MathAttach</span> &lt;6:21~6:24&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:21~6:22&gt;
        - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;6:22~6:23&gt;
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:23~6:24&gt;
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:25~6:26&gt;
      - s: <span style='color:#7dcfff'>Marked::MathAttach</span> &lt;6:27~6:34&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:27~6:28&gt;
        - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;6:28~6:29&gt;
        - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;6:29~6:34&gt;
          c:
          - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;6:29~6:30&gt;
          - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;6:30~6:33&gt;
            c:
            - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:30~6:31&gt;
            - s: Escape::Shorthand &lt;6:31~6:32&gt;
            - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:32~6:33&gt;
          - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;6:33~6:34&gt;
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:35~6:36&gt;
      - s: <span style='color:#7dcfff'>Marked::MathAttach</span> &lt;6:37~6:44&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:37~6:38&gt;
        - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;6:38~6:39&gt;
        - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;6:39~6:44&gt;
          c:
          - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;6:39~6:40&gt;
          - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;6:40~6:43&gt;
            c:
            - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:40~6:41&gt;
            - s: Escape::Shorthand &lt;6:41~6:42&gt;
            - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:42~6:43&gt;
          - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;6:43~6:44&gt;
    - s: <span style='color:#7dcfff'>Marked::Dollar</span> &lt;6:44~6:45&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;6:45~6:46&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;7:0~7:27&gt;
  - s: <span style='color:#7dcfff'>Marked::Emph</span> &lt;7:28~7:42&gt;
    c:
    - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;7:28~7:29&gt;
    - s: <span style='color:#7dcfff'>Marked::Markup</span> &lt;7:29~7:41&gt;
      c:
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;7:29~7:40&gt;
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;7:40~7:41&gt;
    - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;7:41~7:42&gt;
  - s: <span style='color:#7dcfff'>Marked::Parbreak</span> &lt;7:42~9:0&gt;
  - s: <span style='color:#7dcfff'>Marked::Equation</span> &lt;9:0~10:31&gt;
    c:
    - s: <span style='color:#7dcfff'>Marked::Dollar</span> &lt;9:0~9:1&gt;
    - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;9:2~10:29&gt;
      c:
      - s: <span style='color:#7dcfff'>Marked::MathAttach</span> &lt;9:2~9:5&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:2~9:3&gt;
        - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;9:3~9:4&gt;
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:4~9:5&gt;
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:6~9:7&gt;
      - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;9:8~9:36&gt;
        c:
        - s: <span style='color:#7aa2f7'>Fn::(MathIdent: &quot;round&quot;)</span> &lt;9:8~9:13&gt;
        - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;9:13~9:36&gt;
          c:
          - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;9:13~9:14&gt;
          - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;9:14~9:35&gt;
            c:
            - s: <span style='color:#7dcfff'>Marked::MathFrac</span> &lt;9:14~9:25&gt;
              c:
              - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:14~9:15&gt;
              - s: <span style='color:#7dcfff'>Marked::Slash</span> &lt;9:16~9:17&gt;
              - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;9:18~9:25&gt;
                c:
                - s: <span style='color:#7aa2f7'>Fn::(MathIdent: &quot;sqrt&quot;)</span> &lt;9:18~9:22&gt;
                - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;9:22~9:25&gt;
                  c:
                  - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;9:22~9:23&gt;
                  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:23~9:24&gt;
                  - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;9:24~9:25&gt;
            - s: <span style='color:#7dcfff'>Marked::MathAttach</span> &lt;9:26~9:35&gt;
              c:
              - s: <span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;9:26~9:33&gt;
                c:
                - s: <span style='color:#0f4b6e'>Var::(MathIdent: &quot;phi&quot;)</span> &lt;9:26~9:29&gt;
                - s: <span style='color:#c0caf5'>Punc::Dot</span> &lt;9:29~9:30&gt;
                - s: <span style='color:#0f4b6e'>Var::(Ident: &quot;alt&quot;)</span> &lt;9:30~9:33&gt;
              - s: <span style='color:#7dcfff'>Marked::Hat</span> &lt;9:33~9:34&gt;
              - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:34~9:35&gt;
          - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;9:35~9:36&gt;
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;9:36~9:37&gt;
      - s: <span style='color:#0f4b6e'>Var::(MathIdent: &quot;quad&quot;)</span> &lt;9:38~9:42&gt;
      - s: <span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;10:2~10:9&gt;
        c:
        - s: <span style='color:#0f4b6e'>Var::(MathIdent: &quot;phi&quot;)</span> &lt;10:2~10:5&gt;
        - s: <span style='color:#c0caf5'>Punc::Dot</span> &lt;10:5~10:6&gt;
        - s: <span style='color:#0f4b6e'>Var::(Ident: &quot;alt&quot;)</span> &lt;10:6~10:9&gt;
      - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;10:10~10:11&gt;
      - s: <span style='color:#7dcfff'>Marked::MathFrac</span> &lt;10:12~10:29&gt;
        c:
        - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;10:12~10:25&gt;
          c:
          - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;10:12~10:13&gt;
          - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;10:13~10:24&gt;
            c:
            - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;10:13~10:14&gt;
            - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;10:15~10:16&gt;
            - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;10:17~10:24&gt;
              c:
              - s: <span style='color:#7aa2f7'>Fn::(MathIdent: &quot;sqrt&quot;)</span> &lt;10:17~10:21&gt;
              - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;10:21~10:24&gt;
                c:
                - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;10:21~10:22&gt;
                - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;10:22~10:23&gt;
                - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;10:23~10:24&gt;
          - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;10:24~10:25&gt;
        - s: <span style='color:#7dcfff'>Marked::Slash</span> &lt;10:26~10:27&gt;
        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;10:28~10:29&gt;
    - s: <span style='color:#7dcfff'>Marked::Dollar</span> &lt;10:30~10:31&gt;
  - s: <span style='color:#7dcfff'>Marked::Parbreak</span> &lt;10:31~12:0&gt;
  - s: <span style='color:#bb9af7'>Kw::Hash</span> &lt;12:0~12:1&gt;
  - s: <span style='color:#7dcfff'>Marked::LetBinding</span> &lt;12:1~12:14&gt;
    c:
    - s: <span style='color:#bb9af7'>Kw::Let</span> &lt;12:1~12:4&gt;
    - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;count&quot;)</span> &lt;12:5~12:10&gt;
    - s: <span style='color:#c0caf5'>Op::Eq</span> &lt;12:11~12:12&gt;
    - s: <span style='color:#e08f68'>Num(Int, 8)</span> &lt;12:13~12:14&gt;
  - s: <span style='color:#bb9af7'>Kw::Hash</span> &lt;13:0~13:1&gt;
  - s: <span style='color:#7dcfff'>Marked::LetBinding</span> &lt;13:1~13:31&gt;
    c:
    - s: <span style='color:#bb9af7'>Kw::Let</span> &lt;13:1~13:4&gt;
    - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;nums&quot;)</span> &lt;13:5~13:9&gt;
    - s: <span style='color:#c0caf5'>Op::Eq</span> &lt;13:10~13:11&gt;
    - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;13:12~13:31&gt;
      c:
      - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;range&quot;)</span> &lt;13:12~13:17&gt;
      - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;13:17~13:31&gt;
        c:
        - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;13:17~13:18&gt;
        - s: <span style='color:#e08f68'>Num(Int, 1)</span> &lt;13:18~13:19&gt;
        - s: <span style='color:#c0caf5'>Punc::Comma</span> &lt;13:19~13:20&gt;
        - s: <span style='color:#7dcfff'>Marked::Binary</span> &lt;13:21~13:30&gt;
          c:
          - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;count&quot;)</span> &lt;13:21~13:26&gt;
          - s: <span style='color:#c0caf5'>Op::Plus</span> &lt;13:27~13:28&gt;
          - s: <span style='color:#e08f68'>Num(Int, 1)</span> &lt;13:29~13:30&gt;
        - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;13:30~13:31&gt;
  - s: <span style='color:#bb9af7'>Kw::Hash</span> &lt;14:0~14:1&gt;
  - s: <span style='color:#7dcfff'>Marked::LetBinding</span> &lt;14:1~17:1&gt;
    c:
    - s: <span style='color:#bb9af7'>Kw::Let</span> &lt;14:1~14:4&gt;
    - s: <span style='color:#7dcfff'>Marked::Closure</span> &lt;14:5~17:1&gt;
      c:
      - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;14:5~14:8&gt;
      - s: <span style='color:#7dcfff'>Marked::Params</span> &lt;14:8~14:11&gt;
        c:
        - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;14:8~14:9&gt;
        - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;14:9~14:10&gt;
        - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;14:10~14:11&gt;
      - s: <span style='color:#c0caf5'>Op::Eq</span> &lt;14:12~14:13&gt;
      - s: <span style='color:#7dcfff'>Marked::Parenthesized</span> &lt;14:14~17:1&gt;
        c:
        - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;14:14~14:15&gt;
        - s: <span style='color:#7dcfff'>Marked::Conditional</span> &lt;15:2~16:34&gt;
          c:
          - s: <span style='color:#bb9af7'>Kw::If</span> &lt;15:2~15:4&gt;
          - s: <span style='color:#7dcfff'>Marked::Binary</span> &lt;15:5~15:11&gt;
            c:
            - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;15:5~15:6&gt;
            - s: <span style='color:#c0caf5'>Op::LtEq</span> &lt;15:7~15:9&gt;
            - s: <span style='color:#e08f68'>Num(Int, 2)</span> &lt;15:10~15:11&gt;
          - s: <span style='color:#7dcfff'>Marked::CodeBlock</span> &lt;15:12~15:17&gt;
            c:
            - s: <span style='color:#c0caf5'>Punc::LeftBrace</span> &lt;15:12~15:13&gt;
            - s: <span style='color:#7dcfff'>Marked::Code</span> &lt;15:14~15:15&gt;
              c:
              - s: <span style='color:#e08f68'>Num(Int, 1)</span> &lt;15:14~15:15&gt;
            - s: <span style='color:#c0caf5'>Punc::RightBrace</span> &lt;15:16~15:17&gt;
          - s: <span style='color:#bb9af7'>Kw::Else</span> &lt;16:2~16:6&gt;
          - s: <span style='color:#7dcfff'>Marked::CodeBlock</span> &lt;16:7~16:34&gt;
            c:
            - s: <span style='color:#c0caf5'>Punc::LeftBrace</span> &lt;16:7~16:8&gt;
            - s: <span style='color:#7dcfff'>Marked::Code</span> &lt;16:9~16:32&gt;
              c:
              - s: <span style='color:#7dcfff'>Marked::Binary</span> &lt;16:9~16:32&gt;
                c:
                - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;16:9~16:19&gt;
                  c:
                  - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;16:9~16:12&gt;
                  - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;16:12~16:19&gt;
                    c:
                    - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;16:12~16:13&gt;
                    - s: <span style='color:#7dcfff'>Marked::Binary</span> &lt;16:13~16:18&gt;
                      c:
                      - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;16:13~16:14&gt;
                      - s: <span style='color:#c0caf5'>Op::Minus</span> &lt;16:15~16:16&gt;
                      - s: <span style='color:#e08f68'>Num(Int, 1)</span> &lt;16:17~16:18&gt;
                    - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;16:18~16:19&gt;
                - s: <span style='color:#c0caf5'>Op::Plus</span> &lt;16:20~16:21&gt;
                - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;16:22~16:32&gt;
                  c:
                  - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;16:22~16:25&gt;
                  - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;16:25~16:32&gt;
                    c:
                    - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;16:25~16:26&gt;
                    - s: <span style='color:#7dcfff'>Marked::Binary</span> &lt;16:26~16:31&gt;
                      c:
                      - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;16:26~16:27&gt;
                      - s: <span style='color:#c0caf5'>Op::Minus</span> &lt;16:28~16:29&gt;
                      - s: <span style='color:#e08f68'>Num(Int, 2)</span> &lt;16:30~16:31&gt;
                    - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;16:31~16:32&gt;
            - s: <span style='color:#c0caf5'>Punc::RightBrace</span> &lt;16:33~16:34&gt;
        - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;17:0~17:1&gt;
  - s: <span style='color:#7dcfff'>Marked::Parbreak</span> &lt;17:1~19:0&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;19:0~19:9&gt;
  - s: <span style='color:#0f4b6e'>Var::(Hash: &quot;#&quot;)</span> &lt;19:10~19:11&gt;
  - s: <span style='color:#0f4b6e'>Var::(Ident: &quot;count&quot;)</span> &lt;19:11~19:16&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;19:17~19:44&gt;
  - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;19:44~19:45&gt;
  - s: <span style='color:#7dcfff'>Marked::Parbreak</span> &lt;19:45~21:0&gt;
  - s: <span style='color:#7aa2f7'>Fn::(Hash: &quot;#&quot;)</span> &lt;21:0~21:1&gt;
  - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;21:1~25:2&gt;
    c:
    - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;align&quot;)</span> &lt;21:1~21:6&gt;
    - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;21:6~25:2&gt;
      c:
      - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;21:6~21:7&gt;
      - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;center&quot;)</span> &lt;21:7~21:13&gt;
      - s: <span style='color:#c0caf5'>Punc::Comma</span> &lt;21:13~21:14&gt;
      - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;21:15~25:1&gt;
        c:
        - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;table&quot;)</span> &lt;21:15~21:20&gt;
        - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;21:20~25:1&gt;
          c:
          - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;21:20~21:21&gt;
          - s: <span style='color:#7dcfff'>Marked::Named</span> &lt;22:2~22:16&gt;
            c:
            - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;columns&quot;)</span> &lt;22:2~22:9&gt;
            - s: <span style='color:#c0caf5'>Punc::Colon</span> &lt;22:9~22:10&gt;
            - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;count&quot;)</span> &lt;22:11~22:16&gt;
          - s: <span style='color:#c0caf5'>Punc::Comma</span> &lt;22:16~22:17&gt;
          - s: <span style='color:#7dcfff'>Marked::Spread</span> &lt;23:2~23:25&gt;
            c:
            - s: <span style='color:#c0caf5'>Op::Dots</span> &lt;23:2~23:4&gt;
            - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;23:4~23:25&gt;
              c:
              - s: <span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;23:4~23:12&gt;
                c:
                - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;nums&quot;)</span> &lt;23:4~23:8&gt;
                - s: <span style='color:#c0caf5'>Punc::Dot</span> &lt;23:8~23:9&gt;
                - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;map&quot;)</span> &lt;23:9~23:12&gt;
              - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;23:12~23:25&gt;
                c:
                - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;23:12~23:13&gt;
                - s: <span style='color:#7dcfff'>Marked::Closure</span> &lt;23:13~23:24&gt;
                  c:
                  - s: <span style='color:#7dcfff'>Marked::Params</span> &lt;23:13~23:14&gt;
                    c:
                    - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;23:13~23:14&gt;
                  - s: <span style='color:#c0caf5'>Op::Arrow</span> &lt;23:15~23:17&gt;
                  - s: <span style='color:#7dcfff'>Marked::Equation</span> &lt;23:18~23:24&gt;
                    c:
                    - s: <span style='color:#7dcfff'>Marked::Dollar</span> &lt;23:18~23:19&gt;
                    - s: <span style='color:#7dcfff'>Marked::Math</span> &lt;23:19~23:23&gt;
                      c:
                      - s: <span style='color:#7dcfff'>Marked::MathAttach</span> &lt;23:19~23:23&gt;
                        c:
                        - s: <span style='color:#7dcfff'>Marked::Text</span> &lt;23:19~23:20&gt;
                        - s: <span style='color:#7dcfff'>Marked::Underscore</span> &lt;23:20~23:21&gt;
                        - s: <span style='color:#0f4b6e'>Var::(Hash: &quot;#&quot;)</span> &lt;23:21~23:22&gt;
                        - s: <span style='color:#0f4b6e'>Var::(Ident: &quot;n&quot;)</span> &lt;23:22~23:23&gt;
                    - s: <span style='color:#7dcfff'>Marked::Dollar</span> &lt;23:23~23:24&gt;
                - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;23:24~23:25&gt;
          - s: <span style='color:#c0caf5'>Punc::Comma</span> &lt;23:25~23:26&gt;
          - s: <span style='color:#7dcfff'>Marked::Spread</span> &lt;24:2~24:30&gt;
            c:
            - s: <span style='color:#c0caf5'>Op::Dots</span> &lt;24:2~24:4&gt;
            - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;24:4~24:30&gt;
              c:
              - s: <span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;24:4~24:12&gt;
                c:
                - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;nums&quot;)</span> &lt;24:4~24:8&gt;
                - s: <span style='color:#c0caf5'>Punc::Dot</span> &lt;24:8~24:9&gt;
                - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;map&quot;)</span> &lt;24:9~24:12&gt;
              - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;24:12~24:30&gt;
                c:
                - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;24:12~24:13&gt;
                - s: <span style='color:#7dcfff'>Marked::Closure</span> &lt;24:13~24:29&gt;
                  c:
                  - s: <span style='color:#7dcfff'>Marked::Params</span> &lt;24:13~24:14&gt;
                    c:
                    - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;24:13~24:14&gt;
                  - s: <span style='color:#c0caf5'>Op::Arrow</span> &lt;24:15~24:17&gt;
                  - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;24:18~24:29&gt;
                    c:
                    - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;str&quot;)</span> &lt;24:18~24:21&gt;
                    - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;24:21~24:29&gt;
                      c:
                      - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;24:21~24:22&gt;
                      - s: <span style='color:#7dcfff'>Marked::FuncCall</span> &lt;24:22~24:28&gt;
                        c:
                        - s: <span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;24:22~24:25&gt;
                        - s: <span style='color:#7dcfff'>Marked::Args</span> &lt;24:25~24:28&gt;
                          c:
                          - s: <span style='color:#c0caf5'>Punc::LeftParen</span> &lt;24:25~24:26&gt;
                          - s: <span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;24:26~24:27&gt;
                          - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;24:27~24:28&gt;
                      - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;24:28~24:29&gt;
                - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;24:29~24:30&gt;
          - s: <span style='color:#c0caf5'>Punc::Comma</span> &lt;24:30~24:31&gt;
          - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;25:0~25:1&gt;
      - s: <span style='color:#c0caf5'>Punc::RightParen</span> &lt;25:1~25:2&gt;
  - s: <span style='color:#7dcfff'>Marked::Parbreak</span> &lt;25:2~27:0&gt;
  - s: <span style='color:#4d526b'>Ct::LineComment</span> &lt;27:0~27:53&gt;`;

const rawTypstAstObject = {
	s: "<span style='color:#7dcfff'>Marked::Markup</span>",
	c: [
		{ s: "<span style='color:#bb9af7'>Kw::Hash</span> &lt;1:0~1:1&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::SetRule</span> &lt;1:1~1:36&gt;",
			c: [
				{ s: "<span style='color:#bb9af7'>Kw::Set</span> &lt;1:1~1:4&gt;" },
				{
					s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;page&quot;)</span> &lt;1:5~1:9&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;1:9~1:36&gt;",
					c: [
						{
							s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;1:9~1:10&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Named</span> &lt;1:10~1:21&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;width&quot;)</span> &lt;1:10~1:15&gt;",
								},
								{
									s: "<span style='color:#c0caf5'>Punc::Colon</span> &lt;1:15~1:16&gt;",
								},
								{
									s: "<span style='color:#e08f68'>Num(Numeric, 10Cm)</span> &lt;1:17~1:21&gt;",
								},
							],
						},
						{
							s: "<span style='color:#c0caf5'>Punc::Comma</span> &lt;1:21~1:22&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Named</span> &lt;1:23~1:35&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;height&quot;)</span> &lt;1:23~1:29&gt;",
								},
								{
									s: "<span style='color:#c0caf5'>Punc::Colon</span> &lt;1:29~1:30&gt;",
								},
								{
									s: "<span style='color:#bb9af7'>Kw::Auto</span> &lt;1:31~1:35&gt;",
								},
							],
						},
						{
							s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;1:35~1:36&gt;",
						},
					],
				},
			],
		},
		{ s: "<span style='color:#bb9af7'>Kw::Hash</span> &lt;2:0~2:1&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::SetRule</span> &lt;2:1~2:29&gt;",
			c: [
				{ s: "<span style='color:#bb9af7'>Kw::Set</span> &lt;2:1~2:4&gt;" },
				{
					s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;heading&quot;)</span> &lt;2:5~2:12&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;2:12~2:29&gt;",
					c: [
						{
							s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;2:12~2:13&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Named</span> &lt;2:13~2:28&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;numbering&quot;)</span> &lt;2:13~2:22&gt;",
								},
								{
									s: "<span style='color:#c0caf5'>Punc::Colon</span> &lt;2:22~2:23&gt;",
								},
								{
									s: "<span style='color:#9ece6a'>Str(&quot;1.&quot;)</span> &lt;2:24~2:28&gt;",
								},
							],
						},
						{
							s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;2:28~2:29&gt;",
						},
					],
				},
			],
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;2:29~4:0&gt;",
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Heading</span> &lt;4:0~4:20&gt;",
			c: [
				{
					s: "<span style='color:#7dcfff'>Marked::HeadingMarker</span> &lt;4:0~4:1&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Markup</span> &lt;4:2~4:20&gt;",
					c: [
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;4:2~4:20&gt;",
						},
					],
				},
			],
		},
		{ s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;5:0~5:45&gt;" },
		{ s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:0~6:19&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::Equation</span> &lt;6:20~6:45&gt;",
			c: [
				{
					s: "<span style='color:#7dcfff'>Marked::Dollar</span> &lt;6:20~6:21&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;6:21~6:44&gt;",
					c: [
						{
							s: "<span style='color:#7dcfff'>Marked::MathAttach</span> &lt;6:21~6:24&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:21~6:22&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;6:22~6:23&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:23~6:24&gt;",
								},
							],
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:25~6:26&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::MathAttach</span> &lt;6:27~6:34&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:27~6:28&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;6:28~6:29&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;6:29~6:34&gt;",
									c: [
										{
											s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;6:29~6:30&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;6:30~6:33&gt;",
											c: [
												{
													s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:30~6:31&gt;",
												},
												{ s: "Escape::Shorthand &lt;6:31~6:32&gt;" },
												{
													s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:32~6:33&gt;",
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;6:33~6:34&gt;",
										},
									],
								},
							],
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:35~6:36&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::MathAttach</span> &lt;6:37~6:44&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:37~6:38&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;6:38~6:39&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;6:39~6:44&gt;",
									c: [
										{
											s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;6:39~6:40&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;6:40~6:43&gt;",
											c: [
												{
													s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:40~6:41&gt;",
												},
												{ s: "Escape::Shorthand &lt;6:41~6:42&gt;" },
												{
													s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:42~6:43&gt;",
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;6:43~6:44&gt;",
										},
									],
								},
							],
						},
					],
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Dollar</span> &lt;6:44~6:45&gt;",
				},
			],
		},
		{ s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;6:45~6:46&gt;" },
		{ s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;7:0~7:27&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::Emph</span> &lt;7:28~7:42&gt;",
			c: [
				{
					s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;7:28~7:29&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Markup</span> &lt;7:29~7:41&gt;",
					c: [
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;7:29~7:40&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;7:40~7:41&gt;",
						},
					],
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;7:41~7:42&gt;",
				},
			],
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;7:42~9:0&gt;",
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Equation</span> &lt;9:0~10:31&gt;",
			c: [
				{
					s: "<span style='color:#7dcfff'>Marked::Dollar</span> &lt;9:0~9:1&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;9:2~10:29&gt;",
					c: [
						{
							s: "<span style='color:#7dcfff'>Marked::MathAttach</span> &lt;9:2~9:5&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:2~9:3&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;9:3~9:4&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:4~9:5&gt;",
								},
							],
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:6~9:7&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;9:8~9:36&gt;",
							c: [
								{
									s: "<span style='color:#7aa2f7'>Fn::(MathIdent: &quot;round&quot;)</span> &lt;9:8~9:13&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;9:13~9:36&gt;",
									c: [
										{
											s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;9:13~9:14&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;9:14~9:35&gt;",
											c: [
												{
													s: "<span style='color:#7dcfff'>Marked::MathFrac</span> &lt;9:14~9:25&gt;",
													c: [
														{
															s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:14~9:15&gt;",
														},
														{
															s: "<span style='color:#7dcfff'>Marked::Slash</span> &lt;9:16~9:17&gt;",
														},
														{
															s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;9:18~9:25&gt;",
															c: [
																{
																	s: "<span style='color:#7aa2f7'>Fn::(MathIdent: &quot;sqrt&quot;)</span> &lt;9:18~9:22&gt;",
																},
																{
																	s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;9:22~9:25&gt;",
																	c: [
																		{
																			s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;9:22~9:23&gt;",
																		},
																		{
																			s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:23~9:24&gt;",
																		},
																		{
																			s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;9:24~9:25&gt;",
																		},
																	],
																},
															],
														},
													],
												},
												{
													s: "<span style='color:#7dcfff'>Marked::MathAttach</span> &lt;9:26~9:35&gt;",
													c: [
														{
															s: "<span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;9:26~9:33&gt;",
															c: [
																{
																	s: "<span style='color:#0f4b6e'>Var::(MathIdent: &quot;phi&quot;)</span> &lt;9:26~9:29&gt;",
																},
																{
																	s: "<span style='color:#c0caf5'>Punc::Dot</span> &lt;9:29~9:30&gt;",
																},
																{
																	s: "<span style='color:#0f4b6e'>Var::(Ident: &quot;alt&quot;)</span> &lt;9:30~9:33&gt;",
																},
															],
														},
														{
															s: "<span style='color:#7dcfff'>Marked::Hat</span> &lt;9:33~9:34&gt;",
														},
														{
															s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:34~9:35&gt;",
														},
													],
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;9:35~9:36&gt;",
										},
									],
								},
							],
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;9:36~9:37&gt;",
						},
						{
							s: "<span style='color:#0f4b6e'>Var::(MathIdent: &quot;quad&quot;)</span> &lt;9:38~9:42&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;10:2~10:9&gt;",
							c: [
								{
									s: "<span style='color:#0f4b6e'>Var::(MathIdent: &quot;phi&quot;)</span> &lt;10:2~10:5&gt;",
								},
								{
									s: "<span style='color:#c0caf5'>Punc::Dot</span> &lt;10:5~10:6&gt;",
								},
								{
									s: "<span style='color:#0f4b6e'>Var::(Ident: &quot;alt&quot;)</span> &lt;10:6~10:9&gt;",
								},
							],
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;10:10~10:11&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::MathFrac</span> &lt;10:12~10:29&gt;",
							c: [
								{
									s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;10:12~10:25&gt;",
									c: [
										{
											s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;10:12~10:13&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;10:13~10:24&gt;",
											c: [
												{
													s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;10:13~10:14&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;10:15~10:16&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;10:17~10:24&gt;",
													c: [
														{
															s: "<span style='color:#7aa2f7'>Fn::(MathIdent: &quot;sqrt&quot;)</span> &lt;10:17~10:21&gt;",
														},
														{
															s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;10:21~10:24&gt;",
															c: [
																{
																	s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;10:21~10:22&gt;",
																},
																{
																	s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;10:22~10:23&gt;",
																},
																{
																	s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;10:23~10:24&gt;",
																},
															],
														},
													],
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;10:24~10:25&gt;",
										},
									],
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Slash</span> &lt;10:26~10:27&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;10:28~10:29&gt;",
								},
							],
						},
					],
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Dollar</span> &lt;10:30~10:31&gt;",
				},
			],
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;10:31~12:0&gt;",
		},
		{ s: "<span style='color:#bb9af7'>Kw::Hash</span> &lt;12:0~12:1&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::LetBinding</span> &lt;12:1~12:14&gt;",
			c: [
				{ s: "<span style='color:#bb9af7'>Kw::Let</span> &lt;12:1~12:4&gt;" },
				{
					s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;count&quot;)</span> &lt;12:5~12:10&gt;",
				},
				{ s: "<span style='color:#c0caf5'>Op::Eq</span> &lt;12:11~12:12&gt;" },
				{
					s: "<span style='color:#e08f68'>Num(Int, 8)</span> &lt;12:13~12:14&gt;",
				},
			],
		},
		{ s: "<span style='color:#bb9af7'>Kw::Hash</span> &lt;13:0~13:1&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::LetBinding</span> &lt;13:1~13:31&gt;",
			c: [
				{ s: "<span style='color:#bb9af7'>Kw::Let</span> &lt;13:1~13:4&gt;" },
				{
					s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;nums&quot;)</span> &lt;13:5~13:9&gt;",
				},
				{ s: "<span style='color:#c0caf5'>Op::Eq</span> &lt;13:10~13:11&gt;" },
				{
					s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;13:12~13:31&gt;",
					c: [
						{
							s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;range&quot;)</span> &lt;13:12~13:17&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;13:17~13:31&gt;",
							c: [
								{
									s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;13:17~13:18&gt;",
								},
								{
									s: "<span style='color:#e08f68'>Num(Int, 1)</span> &lt;13:18~13:19&gt;",
								},
								{
									s: "<span style='color:#c0caf5'>Punc::Comma</span> &lt;13:19~13:20&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Binary</span> &lt;13:21~13:30&gt;",
									c: [
										{
											s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;count&quot;)</span> &lt;13:21~13:26&gt;",
										},
										{
											s: "<span style='color:#c0caf5'>Op::Plus</span> &lt;13:27~13:28&gt;",
										},
										{
											s: "<span style='color:#e08f68'>Num(Int, 1)</span> &lt;13:29~13:30&gt;",
										},
									],
								},
								{
									s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;13:30~13:31&gt;",
								},
							],
						},
					],
				},
			],
		},
		{ s: "<span style='color:#bb9af7'>Kw::Hash</span> &lt;14:0~14:1&gt;" },
		{
			s: "<span style='color:#7dcfff'>Marked::LetBinding</span> &lt;14:1~17:1&gt;",
			c: [
				{ s: "<span style='color:#bb9af7'>Kw::Let</span> &lt;14:1~14:4&gt;" },
				{
					s: "<span style='color:#7dcfff'>Marked::Closure</span> &lt;14:5~17:1&gt;",
					c: [
						{
							s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;14:5~14:8&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Params</span> &lt;14:8~14:11&gt;",
							c: [
								{
									s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;14:8~14:9&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;14:9~14:10&gt;",
								},
								{
									s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;14:10~14:11&gt;",
								},
							],
						},
						{
							s: "<span style='color:#c0caf5'>Op::Eq</span> &lt;14:12~14:13&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::Parenthesized</span> &lt;14:14~17:1&gt;",
							c: [
								{
									s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;14:14~14:15&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Conditional</span> &lt;15:2~16:34&gt;",
									c: [
										{
											s: "<span style='color:#bb9af7'>Kw::If</span> &lt;15:2~15:4&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Binary</span> &lt;15:5~15:11&gt;",
											c: [
												{
													s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;15:5~15:6&gt;",
												},
												{
													s: "<span style='color:#c0caf5'>Op::LtEq</span> &lt;15:7~15:9&gt;",
												},
												{
													s: "<span style='color:#e08f68'>Num(Int, 2)</span> &lt;15:10~15:11&gt;",
												},
											],
										},
										{
											s: "<span style='color:#7dcfff'>Marked::CodeBlock</span> &lt;15:12~15:17&gt;",
											c: [
												{
													s: "<span style='color:#c0caf5'>Punc::LeftBrace</span> &lt;15:12~15:13&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::Code</span> &lt;15:14~15:15&gt;",
													c: [
														{
															s: "<span style='color:#e08f68'>Num(Int, 1)</span> &lt;15:14~15:15&gt;",
														},
													],
												},
												{
													s: "<span style='color:#c0caf5'>Punc::RightBrace</span> &lt;15:16~15:17&gt;",
												},
											],
										},
										{
											s: "<span style='color:#bb9af7'>Kw::Else</span> &lt;16:2~16:6&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::CodeBlock</span> &lt;16:7~16:34&gt;",
											c: [
												{
													s: "<span style='color:#c0caf5'>Punc::LeftBrace</span> &lt;16:7~16:8&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::Code</span> &lt;16:9~16:32&gt;",
													c: [
														{
															s: "<span style='color:#7dcfff'>Marked::Binary</span> &lt;16:9~16:32&gt;",
															c: [
																{
																	s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;16:9~16:19&gt;",
																	c: [
																		{
																			s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;16:9~16:12&gt;",
																		},
																		{
																			s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;16:12~16:19&gt;",
																			c: [
																				{
																					s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;16:12~16:13&gt;",
																				},
																				{
																					s: "<span style='color:#7dcfff'>Marked::Binary</span> &lt;16:13~16:18&gt;",
																					c: [
																						{
																							s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;16:13~16:14&gt;",
																						},
																						{
																							s: "<span style='color:#c0caf5'>Op::Minus</span> &lt;16:15~16:16&gt;",
																						},
																						{
																							s: "<span style='color:#e08f68'>Num(Int, 1)</span> &lt;16:17~16:18&gt;",
																						},
																					],
																				},
																				{
																					s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;16:18~16:19&gt;",
																				},
																			],
																		},
																	],
																},
																{
																	s: "<span style='color:#c0caf5'>Op::Plus</span> &lt;16:20~16:21&gt;",
																},
																{
																	s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;16:22~16:32&gt;",
																	c: [
																		{
																			s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;16:22~16:25&gt;",
																		},
																		{
																			s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;16:25~16:32&gt;",
																			c: [
																				{
																					s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;16:25~16:26&gt;",
																				},
																				{
																					s: "<span style='color:#7dcfff'>Marked::Binary</span> &lt;16:26~16:31&gt;",
																					c: [
																						{
																							s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;16:26~16:27&gt;",
																						},
																						{
																							s: "<span style='color:#c0caf5'>Op::Minus</span> &lt;16:28~16:29&gt;",
																						},
																						{
																							s: "<span style='color:#e08f68'>Num(Int, 2)</span> &lt;16:30~16:31&gt;",
																						},
																					],
																				},
																				{
																					s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;16:31~16:32&gt;",
																				},
																			],
																		},
																	],
																},
															],
														},
													],
												},
												{
													s: "<span style='color:#c0caf5'>Punc::RightBrace</span> &lt;16:33~16:34&gt;",
												},
											],
										},
									],
								},
								{
									s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;17:0~17:1&gt;",
								},
							],
						},
					],
				},
			],
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;17:1~19:0&gt;",
		},
		{ s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;19:0~19:9&gt;" },
		{
			s: "<span style='color:#0f4b6e'>Var::(Hash: &quot;#&quot;)</span> &lt;19:10~19:11&gt;",
		},
		{
			s: "<span style='color:#0f4b6e'>Var::(Ident: &quot;count&quot;)</span> &lt;19:11~19:16&gt;",
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;19:17~19:44&gt;",
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;19:44~19:45&gt;",
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;19:45~21:0&gt;",
		},
		{
			s: "<span style='color:#7aa2f7'>Fn::(Hash: &quot;#&quot;)</span> &lt;21:0~21:1&gt;",
		},
		{
			s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;21:1~25:2&gt;",
			c: [
				{
					s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;align&quot;)</span> &lt;21:1~21:6&gt;",
				},
				{
					s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;21:6~25:2&gt;",
					c: [
						{
							s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;21:6~21:7&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;center&quot;)</span> &lt;21:7~21:13&gt;",
						},
						{
							s: "<span style='color:#c0caf5'>Punc::Comma</span> &lt;21:13~21:14&gt;",
						},
						{
							s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;21:15~25:1&gt;",
							c: [
								{
									s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;table&quot;)</span> &lt;21:15~21:20&gt;",
								},
								{
									s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;21:20~25:1&gt;",
									c: [
										{
											s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;21:20~21:21&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Named</span> &lt;22:2~22:16&gt;",
											c: [
												{
													s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;columns&quot;)</span> &lt;22:2~22:9&gt;",
												},
												{
													s: "<span style='color:#c0caf5'>Punc::Colon</span> &lt;22:9~22:10&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;count&quot;)</span> &lt;22:11~22:16&gt;",
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::Comma</span> &lt;22:16~22:17&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Spread</span> &lt;23:2~23:25&gt;",
											c: [
												{
													s: "<span style='color:#c0caf5'>Op::Dots</span> &lt;23:2~23:4&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;23:4~23:25&gt;",
													c: [
														{
															s: "<span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;23:4~23:12&gt;",
															c: [
																{
																	s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;nums&quot;)</span> &lt;23:4~23:8&gt;",
																},
																{
																	s: "<span style='color:#c0caf5'>Punc::Dot</span> &lt;23:8~23:9&gt;",
																},
																{
																	s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;map&quot;)</span> &lt;23:9~23:12&gt;",
																},
															],
														},
														{
															s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;23:12~23:25&gt;",
															c: [
																{
																	s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;23:12~23:13&gt;",
																},
																{
																	s: "<span style='color:#7dcfff'>Marked::Closure</span> &lt;23:13~23:24&gt;",
																	c: [
																		{
																			s: "<span style='color:#7dcfff'>Marked::Params</span> &lt;23:13~23:14&gt;",
																			c: [
																				{
																					s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;23:13~23:14&gt;",
																				},
																			],
																		},
																		{
																			s: "<span style='color:#c0caf5'>Op::Arrow</span> &lt;23:15~23:17&gt;",
																		},
																		{
																			s: "<span style='color:#7dcfff'>Marked::Equation</span> &lt;23:18~23:24&gt;",
																			c: [
																				{
																					s: "<span style='color:#7dcfff'>Marked::Dollar</span> &lt;23:18~23:19&gt;",
																				},
																				{
																					s: "<span style='color:#7dcfff'>Marked::Math</span> &lt;23:19~23:23&gt;",
																					c: [
																						{
																							s: "<span style='color:#7dcfff'>Marked::MathAttach</span> &lt;23:19~23:23&gt;",
																							c: [
																								{
																									s: "<span style='color:#7dcfff'>Marked::Text</span> &lt;23:19~23:20&gt;",
																								},
																								{
																									s: "<span style='color:#7dcfff'>Marked::Underscore</span> &lt;23:20~23:21&gt;",
																								},
																								{
																									s: "<span style='color:#0f4b6e'>Var::(Hash: &quot;#&quot;)</span> &lt;23:21~23:22&gt;",
																								},
																								{
																									s: "<span style='color:#0f4b6e'>Var::(Ident: &quot;n&quot;)</span> &lt;23:22~23:23&gt;",
																								},
																							],
																						},
																					],
																				},
																				{
																					s: "<span style='color:#7dcfff'>Marked::Dollar</span> &lt;23:23~23:24&gt;",
																				},
																			],
																		},
																	],
																},
																{
																	s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;23:24~23:25&gt;",
																},
															],
														},
													],
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::Comma</span> &lt;23:25~23:26&gt;",
										},
										{
											s: "<span style='color:#7dcfff'>Marked::Spread</span> &lt;24:2~24:30&gt;",
											c: [
												{
													s: "<span style='color:#c0caf5'>Op::Dots</span> &lt;24:2~24:4&gt;",
												},
												{
													s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;24:4~24:30&gt;",
													c: [
														{
															s: "<span style='color:#7dcfff'>Marked::FieldAccess</span> &lt;24:4~24:12&gt;",
															c: [
																{
																	s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;nums&quot;)</span> &lt;24:4~24:8&gt;",
																},
																{
																	s: "<span style='color:#c0caf5'>Punc::Dot</span> &lt;24:8~24:9&gt;",
																},
																{
																	s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;map&quot;)</span> &lt;24:9~24:12&gt;",
																},
															],
														},
														{
															s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;24:12~24:30&gt;",
															c: [
																{
																	s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;24:12~24:13&gt;",
																},
																{
																	s: "<span style='color:#7dcfff'>Marked::Closure</span> &lt;24:13~24:29&gt;",
																	c: [
																		{
																			s: "<span style='color:#7dcfff'>Marked::Params</span> &lt;24:13~24:14&gt;",
																			c: [
																				{
																					s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;24:13~24:14&gt;",
																				},
																			],
																		},
																		{
																			s: "<span style='color:#c0caf5'>Op::Arrow</span> &lt;24:15~24:17&gt;",
																		},
																		{
																			s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;24:18~24:29&gt;",
																			c: [
																				{
																					s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;str&quot;)</span> &lt;24:18~24:21&gt;",
																				},
																				{
																					s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;24:21~24:29&gt;",
																					c: [
																						{
																							s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;24:21~24:22&gt;",
																						},
																						{
																							s: "<span style='color:#7dcfff'>Marked::FuncCall</span> &lt;24:22~24:28&gt;",
																							c: [
																								{
																									s: "<span style='color:#7aa2f7'>Fn::(Ident: &quot;fib&quot;)</span> &lt;24:22~24:25&gt;",
																								},
																								{
																									s: "<span style='color:#7dcfff'>Marked::Args</span> &lt;24:25~24:28&gt;",
																									c: [
																										{
																											s: "<span style='color:#c0caf5'>Punc::LeftParen</span> &lt;24:25~24:26&gt;",
																										},
																										{
																											s: "<span style='color:#7dcfff'>Marked::(Ident: &quot;n&quot;)</span> &lt;24:26~24:27&gt;",
																										},
																										{
																											s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;24:27~24:28&gt;",
																										},
																									],
																								},
																							],
																						},
																						{
																							s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;24:28~24:29&gt;",
																						},
																					],
																				},
																			],
																		},
																	],
																},
																{
																	s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;24:29~24:30&gt;",
																},
															],
														},
													],
												},
											],
										},
										{
											s: "<span style='color:#c0caf5'>Punc::Comma</span> &lt;24:30~24:31&gt;",
										},
										{
											s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;25:0~25:1&gt;",
										},
									],
								},
							],
						},
						{
							s: "<span style='color:#c0caf5'>Punc::RightParen</span> &lt;25:1~25:2&gt;",
						},
					],
				},
			],
		},
		{
			s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;25:2~27:0&gt;",
		},
		{
			s: "<span style='color:#4d526b'>Ct::LineComment</span> &lt;27:0~27:53&gt;",
		},
	],
};

const textlintAstObject = JSON.parse(
	fs.readFileSync(path.join(__dirname, "textlintAstObject.json"), "utf-8"),
);

describe("getRawTypstAstString", () => {
	it("should return raw typst ast string", async () => {
		const actualRawTypstAstString = await getRawTypstAstString(typstSource);
		expect(actualRawTypstAstString).toStrictEqual(rawTypstAstString);
	});
});

describe("convertRawTypstAstStringToObject", () => {
	it("should convert raw Typst AST to raw Typst AST object", async () => {
		const actualRawTypstAstObject =
			await convertRawTypstAstStringToObject(rawTypstAstString);
		expect(actualRawTypstAstObject).toStrictEqual(rawTypstAstObject);
	});
});

describe("extractRawSourceByLocation", () => {
	it("should extract substring from a single line", async () => {
		const location = {
			start: { line: 1, column: 3 },
			end: { line: 1, column: 8 },
		};
		const actualRawSource = await extractRawSourceByLocation(
			typstSource,
			location,
		);
		expect(actualRawSource).toStrictEqual("t pag");
	});

	it("should extract substring across multiple lines", async () => {
		const location = {
			start: { line: 1, column: 2 },
			end: { line: 2, column: 12 },
		};
		const actualRawSource = await extractRawSourceByLocation(
			typstSource,
			location,
		);
		expect(actualRawSource).toStrictEqual(`et page(width: 10cm, height: auto)
#set heading`);
	});
});

describe("convertRawTypstAstObjectToTextlintAstObject", () => {
	it("should convert raw Typst AST object to textlint AST object", async () => {
		const actualTextlintAstObject =
			await convertRawTypstAstObjectToTextlintAstObject(
				rawTypstAstObject,
				typstSource,
			);
		expect(actualTextlintAstObject).toStrictEqual(textlintAstObject);
		ASTTester.test(actualTextlintAstObject);
	});
});

describe("convertTypstSourceToTextlintAstObject", () => {
	it("should convert Typst source to textlint AST object", async () => {
		const actualTextlintAstObject =
			await convertTypstSourceToTextlintAstObject(typstSource);
		expect(actualTextlintAstObject).toStrictEqual(textlintAstObject);
		ASTTester.test(actualTextlintAstObject);
	});
});
