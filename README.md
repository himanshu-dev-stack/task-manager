# Task Manager — DOM, Events & the Browser Rendering Pipeline

A fully interactive task manager built with **HTML, CSS and Vanilla JavaScript only**.
No frameworks. No libraries. No build step. Every interaction is written with native DOM APIs.

**Live demo:** _add your deployed URL here_
**Repository:** _add your GitHub URL here_

---

## Running the project

```bash
git clone <your-repo-url>
cd task-manager
```

Open `index.html` in a browser, or serve it locally:

```bash
python3 -m http.server 5500
# then visit http://localhost:5500
```

Open DevTools → Console to watch the event-propagation logs.

### File structure

```
task-manager/
├── index.html    # structure + all sections
├── style.css     # theming via [data-theme], layout, components
├── script.js     # all DOM logic, commented by section
└── README.md
```

---

## Features

| # | Feature | Where to find it |
|---|---------|------------------|
| 1 | Task creation (`createElement`, `createTextNode`, `append`, `appendChild`) | `createTaskCard()` |
| 2 | Attributes vs Properties demo | "Attributes vs Properties" section |
| 3 | DOM manipulation (`append`, `prepend`, `before`, `after`, `replaceWith`, `remove`) | Task card actions |
| 4 | Dark / Light theme toggle (`classList`, `dataset`, `setAttribute`) | Header button |
| 5 | Event handling (add, edit, complete, delete) | `addEventListener` throughout |
| 6 | Event delegation — one listener for all cards | `taskList.addEventListener("click", …)` |
| 7 | Bubbling vs Capturing demo with live log | "Event Propagation" section |
| 8 | Rendering pipeline flow diagram | "Browser Rendering Pipeline" section |

### Bonus features implemented

- Task search
- Filter by category **and** by status
- Completed / Pending / Total counters
- Clear All button
- `DocumentFragment` for batched rendering
- `localStorage` persistence (tasks + theme)
- Move task up / down (demonstrates `before()` and `after()`)

---

## Concept Explanations

### Parsing

Parsing is the browser's process of reading raw source and turning it into a structured
representation it can work with. The server sends **bytes**; the browser decodes those bytes
into **characters** using the declared encoding (`<meta charset="UTF-8">`), and then hands
those characters to the tokenizer. Parsing happens for both HTML and CSS, producing the DOM
and the CSSOM respectively.

HTML parsing is *fault-tolerant* by design — an unclosed `<p>` does not throw an error, the
parser repairs the tree and continues. This is very different from JavaScript parsing, which
fails loudly on a syntax error.

### Tokenization

Tokenization is the step inside parsing where a flat stream of characters is grouped into
meaningful units called **tokens**.

For the input `<p class="task-title">Hello</p>` the tokenizer emits:

1. StartTag token — `p`, with attribute `class="task-title"`
2. Character tokens — `H`, `e`, `l`, `l`, `o`
3. EndTag token — `p`

The tree construction stage then consumes these tokens and turns them into nodes. CSS is
tokenized the same way: selectors, braces, property names and values each become tokens.

### DOM Tree

The **Document Object Model** is the object representation of the parsed HTML. Each token
becomes a node, and nodes are linked into a parent–child hierarchy that mirrors the nesting
of the markup.

```
html
└── body
    └── main.layout
        └── section.panel
            └── div#taskList
                └── article.task-card
                    ├── div.task-meta
                    ├── p.task-title
                    └── div.task-actions
```

The DOM is a **live** structure, not a snapshot. Every `createElement()`, `append()` and
`remove()` call in `script.js` mutates this tree, and the browser reacts immediately.

### CSSOM Tree

The **CSS Object Model** is the parallel tree built from stylesheets. It stores the *computed*
style for every node after the cascade, specificity and inheritance have been resolved.

CSSOM construction is **render-blocking**: the browser will not paint until it has the CSSOM,
because painting with incomplete styles would produce a flash of unstyled content. This is why
stylesheets belong in `<head>` and scripts usually at the end of `<body>`.

Inheritance is resolved here — if `body` has `color: var(--text)`, a `<p>` with no colour rule
inherits that computed value in the CSSOM.

### Render Tree

The Render Tree is produced by combining **DOM + CSSOM**. It contains only the nodes that will
actually be *painted*, along with their computed visual styles.

Key distinctions:

- Nodes with `display: none` are **excluded** — they are in the DOM but not the Render Tree.
- Nodes with `visibility: hidden` **are included** — they occupy space, they are just not drawn.
- Non-visual nodes (`<head>`, `<meta>`, `<script>`) never appear in the Render Tree.

This project uses that fact directly: the `.is-hidden` utility class applies `display: none`,
so filtered-out task cards are removed from the Render Tree entirely rather than merely made
transparent.

After the Render Tree comes **Layout (reflow)** — computing the exact geometry of every box —
then **Paint** and **Compositing**, which rasterise the boxes into layers and push them to the
screen.

```
HTML → Parsing → Tokenization → DOM Tree  ┐
                                          ├→ Render Tree → Layout → Paint → Composite
CSS  → Parsing → Tokenization → CSSOM Tree┘
```

### Event Bubbling

After an event fires on its target, it travels **upward** through every ancestor, from the
target to the root. A click on the Child button therefore triggers handlers in this order:

```
Child → Parent → Grandparent → body → html → document → window
```

Bubbling is the **default** behaviour of `addEventListener`:

```js
element.addEventListener("click", handler);        // bubbling
element.addEventListener("click", handler, false); // same thing, explicit
```

### Event Capturing

Before reaching the target, the event first travels **downward** from the root to the target.
This is the capture (or "trickle") phase, and it produces the reverse order:

```
window → document → html → body → Grandparent → Parent → Child
```

To listen during capture, pass a third argument:

```js
element.addEventListener("click", handler, true);
element.addEventListener("click", handler, { capture: true });
```

**The full journey of every event has three phases:** capture (root → target), target, then
bubble (target → root). Capturing is useful when a parent needs to inspect or intercept an
event *before* the target sees it — `event.stopPropagation()` during capture prevents the
target's own handler from ever running.

One detail worth knowing, and the reason for a specific design choice in this project: when
two capture listeners sit on the **same element**, they fire in *registration order*. The
log-clearing listener is therefore attached to `.prop-wrap` (one level above `#grandparent`)
rather than to `#grandparent` itself — otherwise it would wipe the "Grandparent" entry that
had just been written.

### Event Delegation

Instead of attaching a listener to every task card, **one** listener sits on the parent
container and identifies what was clicked using the bubbling phase:

```js
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const card   = button.closest(".task-card");
  const action = button.getAttribute("data-action");

  if (action === "complete") toggleComplete(card, button);
  if (action === "edit")     startEditing(card);
  if (action === "delete")   deleteTask(card);
});
```

Why this matters:

- **Memory** — 1 listener instead of 5 per card × N cards.
- **Dynamic elements** — cards created *after* page load are handled automatically, because
  the listener lives on the parent that already exists.
- **Cleanup** — removing a card cannot leave an orphaned listener behind.

Delegation only works *because* of bubbling: the click on the button rises to `#taskList`,
where `event.target` still points at the original button.

---

## Attributes vs Properties

This is the single most commonly confused topic in the DOM, so the project includes a live
demo for it.

| | Attribute | Property |
|---|---|---|
| Lives in | The HTML markup | The JavaScript object |
| Type | Always a string | Typed (string, boolean, number, object) |
| Accessed with | `getAttribute()` / `setAttribute()` | Dot notation — `el.value` |
| Reflects | The **initial** value from the source | The **current** live state |

### The demonstration

Given this markup:

```html
<input type="text" id="attrInput" value="I am the ATTRIBUTE value" />
```

The user types `typed by user` into the box, then:

```js
attrInput.value                    // "typed by user"              ← PROPERTY: live state
attrInput.getAttribute("value")    // "I am the ATTRIBUTE value"   ← ATTRIBUTE: HTML source
```

They have **diverged**. The attribute only *initialised* the property; typing updates the
property and never touches the attribute. This is exactly why reading form input with
`getAttribute("value")` is a bug — it returns whatever was hard-coded in the HTML.

The demo also shows:

```js
attrInput.setAttribute("value", "written by setAttribute()");
// The attribute changes, but the visible box does NOT —
// once the user has typed, the property is "dirty" and wins.

attrInput.removeAttribute("value");
attrInput.getAttribute("value");   // null
attrInput.hasAttribute("value");   // false
attrInput.value;                   // still "typed by user" — the property survives
```

### `dataset` — the bridge

`data-*` attributes are mirrored onto the `dataset` property object, so both styles work and
stay in sync:

```js
card.setAttribute("data-status", "complete");  // attribute style
card.dataset.status = "complete";              // property style — identical result
card.dataset.status;                           // "complete"
```

Note the naming conversion: `data-my-value` in HTML becomes `dataset.myValue` in JavaScript
(kebab-case → camelCase).

---

## DOM methods used

| Method | Used for |
|---|---|
| `createElement()` | Building every card, button and chip |
| `createTextNode()` | Inserting title and label text explicitly |
| `appendChild()` | Adding a single node |
| `append()` | Adding multiple nodes at once |
| `prepend()` | Placing new tasks at the top of the list |
| `before()` | "Move up" — insert ahead of previous sibling |
| `after()` | "Move down" — insert behind next sibling |
| `replaceWith()` | Edit mode — swap `<p>` ⇄ `<input>` |
| `remove()` | Deleting a task, clearing all |
| `closest()` | Walking up from `event.target` in delegation |
| `querySelector()` / `querySelectorAll()` | Selecting nodes |
| `classList.toggle()` | Show/hide filtered cards, theme class |
| `dataset` | Reading and writing task state |

---

## Deployment

**GitHub Pages**
Settings → Pages → Source: `main` branch, `/root` → Save.

**Netlify**
Drag the project folder onto the Netlify dashboard, or connect the repo.
No build command; publish directory is the project root.

**Vercel**
`vercel` from the project directory, or import the repo. Framework preset: **Other**.

Because this is a static project with no build step, all three work with zero configuration.

---

## Browser support

Works in all modern browsers. The newer insertion methods (`append`, `prepend`, `before`,
`after`, `replaceWith`) are supported everywhere except Internet Explorer.
