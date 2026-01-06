---
title: Markdown Syntax Guide
description: A comprehensive guide to Markdown syntax for formatting text.
date: 2024-06-01
order: 1
tags: [ markdown, reference, formatting ]
relevance: 40
---

## contents

# h1 Heading 8-)

## h2 Heading

### h3 Heading

#### h4 Heading

##### h5 Heading

###### h6 Heading

## Horizontal Rules

___

---

***

## Typographic replacements

Enable typographer option to see result.

(c) (C) (r) (R) (tm) (TM) (p) (P) +-

test.. test... test..... test?..... test!....

!!!!!! ???? ,, -- ---

"Smartypants, double quotes" and 'single quotes'

## Emphasis

**This is bold text**

__This is bold text__

*This is italic text*

_This is italic text_

~~Strikethrough~~

## Blockquotes

> Blockquotes can also be nested...
>> ...by using additional greater-than signs right next to each other...
> > > ...or with spaces between arrows.

## Lists

Unordered

+ Create a list by starting a line with `+`, `-`, or `*`
+ Sub-lists are made by indenting 2 spaces:
    - Marker character change forces new list start:
        * Ac tristique libero volutpat at

        + Facilisis in pretium nisl aliquet

        - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as `1.`

Start numbering with offset:

57. foo
1. bar

## Code

Inline `code`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code

Block code "fences"

```
Sample text here...
```

Syntax highlighting

``` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
```

### Code blocks with titles

You can add a title to code blocks using the `title` attribute:

```typescript title="src/utils/greeting.ts"
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

### Code blocks with captions

You can add a caption below code blocks using the `caption` attribute:

```bash caption="Install project dependencies"
pnpm install
```

### Code blocks with both title and caption

```javascript title="example.js" caption="A simple counter implementation"
let count = 0;

function increment() {
  count++;
  console.log(`Count: ${count}`);
}
```

## Tables

| Option | Description                                                               |
|--------|---------------------------------------------------------------------------|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default.    |
| ext    | extension to be used for dest files.                                      |

Right aligned columns

| Option |                                                               Description |
|-------:|--------------------------------------------------------------------------:|
|   data | path to data files to supply the data that will be passed into templates. |
| engine |    engine to be used for processing templates. Handlebars is the default. |
|    ext |                                      extension to be used for dest files. |

## Links

[link text](http://dev.nodeca.com)

[link with title](http://nodeca.github.io/pica/demo/ "title text!")

Autoconverted link https://github.com/nodeca/pica (enable linkify to see)

## Images

![Minion](https://octodex.github.com/images/minion.png)
![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")

Like links, Images also have a footnote style syntax

![Alt text][id]

With a reference later in the document defining the URL location:

[id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"

## Plugins

The killer feature of `markdown-it` is very effective support of
[syntax plugins](https://www.npmjs.org/browse/keyword/markdown-it-plugin).

### [Emojies](https://github.com/markdown-it/markdown-it-emoji)

> Classic markup: :wink: :cry: :laughing: :yum:
>
> Shortcuts (emoticons): :-) :-( 8-) ;)

see [how to change output](https://github.com/markdown-it/markdown-it-emoji#change-output) with twemoji.

### Subscript / Superscript

Use HTML tags for subscript and superscript:

- 19<sup>th</sup> century
- H<sub>2</sub>O (water molecule)
- E = mc<sup>2</sup>

### Footnotes

Here is some text with a footnote reference[^1].

Another paragraph with a different footnote[^2].

You can reference the same footnote multiple times[^1].

[^1]: This is the first footnote with **bold text** support.
[^2]: This is the second footnote.

### Definition lists

Definition lists allow you to define terms and their descriptions:

<dl>
  <dt>Term 1</dt>
  <dd>Definition 1 with detailed explanation.</dd>

  <dt>Term 2</dt>
  <dd>Definition 2 with <code>inline code</code> support.</dd>

  <dt>Term 3</dt>
  <dd>First definition for Term 3.</dd>
  <dd>Second definition for Term 3.</dd>
</dl>

Use HTML `<dl>`, `<dt>`, and `<dd>` tags for definition lists in your markdown.

### Abbreviations

Use the HTML `<abbr>` tag for abbreviations:

<abbr title="Hyper Text Markup Language">HTML</abbr> is the standard markup language for web pages.

The `title` attribute provides the full expansion when users hover over the abbreviation.

### Callouts / Admonitions

Colibri documentation supports callout boxes for highlighting important information:

:::note
This is a **note** callout. Use it for general information or tips.
:::

:::tip
This is a **tip** callout. Use it for helpful suggestions or best practices.
:::

:::warning
This is a **warning** callout. Use it to caution users about potential issues.
:::

:::danger
This is a **danger** callout. Use it for critical warnings or destructive actions.
:::

You can also add custom titles:

:::warning[Custom Title Here]
This callout has a custom title instead of the default "Warning".
:::
