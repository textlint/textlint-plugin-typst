= textlint for Typst

== multiline comment

/*
Multiline comments should be ignored.
Too long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long sentence.
*/

== single line comment

// Single line comments should be ignored.
// Too long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long sentence.

== element immediately below a comment

// Single line comment
#let some_element = _ => {
  let this_means_nothing = "Fake"
  let another_meaningless_variable = 12345
  // ...
}

== term list

/ Term 1: First line.

  Second line.
  Third line.

  / Nested Term 1: First line.

    Lorem ipsum dolor sit amet, consectetur.

/ Term 2: First line.
/ Term 3: Third line.

== nested list

- Item 1

  - Nested Item 1
  - Nested Item 2

- Item 2

  #let some_element = _ => {
    let this_means_nothing = "Fake"
    let another_meaningless_variable = 12345
    // ...
  }

- Item 3

  $
    "Too long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long math sentence."
  $

- Item 4

  #figure(
    image("glacier.jpg", width: 70%),
    caption: [
      _Glaciers_ form an important part
      of the earth's climate system.
    ],
  ) <glaciers>

== math

$
  "Too long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long math sentence."
$

== figure

#figure(
  image("glacier.jpg", width: 70%),
  caption: [
    _Glaciers_ form an important part
    of the earth's climate system.
  ],
) <glaciers>
