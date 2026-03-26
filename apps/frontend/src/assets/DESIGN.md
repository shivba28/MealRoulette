# Meal Roulette — Design System

## Concept
A blend of three hand-drawn aesthetics on graph paper:
- **Image 1 influence** — loose watercolor washes, warm impressionistic color fills, gestural linework
- **Image 2 influence** — tight ink outlines, bold graphic borders, confident black strokes, top-down composition
- **Image 3 influence** — annotated food journal energy, handwritten callouts, ingredient labels with arrows, scrapbook density

The result: a tactile, illustrated food diary on graph paper. Every screen feels like a page someone sketched during a meal.

---

## Background & Paper

Graph paper base, slightly warmer grid lines than before:

```css
background-color: #f7f2e8;
background-image:
  linear-gradient(#c9dce8 1px, transparent 1px),
  linear-gradient(90deg, #c9dce8 1px, transparent 1px);
background-size: 24px 24px;
```

---

## Color Palette

Inspired by hand-painted food illustration (Image 3). All colors reference real food ingredients.

| Name      | Hex       | Inspired by    | Usage                                        |
|-----------|-----------|----------------|----------------------------------------------|
| Chili     | `#c0392b` | Red chili      | Primary action, borders, tags, highlights    |
| Herb      | `#3a6644` | Fresh herbs    | Cuisine labels, success states, checkmarks   |
| Saffron   | `#d4813a` | Saffron/carrot | Accent wash, card top band, warm highlights  |
| Turmeric  | `#b8973a` | Turmeric       | Secondary accents, decorative elements       |
| Miso      | `#7a4f2a` | Miso/dark wood | Deep accent, borders on dark elements        |
| Ink       | `#2b2118` | India ink      | All outlines, text, structural borders       |
| Paper     | `#f7f2e8` | Cream paper    | App background, card fills                   |
| Grid      | `#c9dce8` | Faint blue ink | Background grid lines, notebook lines        |
| Margin    | `#e8a090` | Red margin ink | Notebook margin lines, decorative rules      |
| Muted     | `#9a856a` | Aged paper     | Section labels, secondary text, annotations  |

---

## Typography

```html
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
```

| Role            | Font   | Weight | Size  | Notes                                              |
|-----------------|--------|--------|-------|----------------------------------------------------|
| Display         | Kalam  | 700    | 34px+ | Recipe reveal, app name, hero moments              |
| Heading         | Kalam  | 700    | 22px  | Recipe titles, section headers                     |
| Body            | Caveat | 400    | 16–17px | Descriptions, metadata, general copy             |
| Annotation      | Caveat | 400    | 13–14px italic | Image 3-style callouts with arrows, ingredient labels |
| Tag / Label     | Caveat | 600    | 13px  | Tags, cuisine types, preference text               |
| Section meta    | Kalam  | 700    | 12px  | Uppercase section headers, dashed underline        |

**Key addition from references:** The annotation style (italic Caveat with `←` or `→` arrows) is used throughout to label ingredients, describe textures, and annotate cards — directly inspired by the food journal sketches in Image 3.

---

## Borders & Shapes

- **All structural borders:** `2px solid #2b2118` — thick ink feel
- **No border-radius** on most elements (squared = more hand-drawn)
- **Slight rotation** on all cards and decorative elements: `±0.5deg to ±1.5deg`
- **Dashed rules:** `1.5px dashed #c8b89a` for section dividers
- **Notebook lines** (inside cards): `repeating-linear-gradient` at 28px intervals in `#c9dce8`

---

## Offset Shadow Technique

Never use CSS `box-shadow`. Use the `::before` pseudo-element offset technique:

```css
.card {
  position: relative;
}
.card::before {
  content: '';
  position: absolute;
  bottom: -5px;
  right: -5px;
  left: 5px;
  top: 5px;
  background: #c0392b;
  opacity: 0.7;
  z-index: -1;
}
```

For lighter elements use a secondary shadow at `bottom: -3px; right: -3px; left: 3px; top: 3px` with `opacity: 0.15–0.2`.

---

## Components

### Recipe Card
- Background: `rgba(255,248,235,0.85)` — warm cream
- Border: `2px solid #2b2118`
- Rotation: `rotate(0.9deg)`
- Red chili offset shadow via `::before`
- Top watercolor band: `5px height, background: #d4813a, opacity: 0.6` (inspired by Image 1 washes)
- Cuisine label: Herb green `#3a6644`, uppercase, letter-spaced
- Title: Kalam 700
- Ingredient annotations: Caveat italic with `←` arrows (Image 3 style)

### Preference / Checklist Card
- Background: `rgba(255,255,255,0.55)`
- Lined notebook background: `repeating-linear-gradient` in `#c9dce8`
- Red margin line at `left: 38px` in `#e8a090`
- Checkbox: `14×14px` square, `2px solid #2b2118`, checkmark `✓` in `#c0392b`
- Rotation: `rotate(-0.7deg)`

### Primary Button
```css
font-family: 'Kalam', cursive;
font-size: 21px;
font-weight: 700;
color: #f7f2e8;
background: #2b2118;
border: none;
padding: 9px 30px;
transform: rotate(-1.2deg);
position: relative;
```
With `::before` offset shadow in `#c0392b`.

### Tags / Badges
```css
font-family: 'Caveat', cursive;
font-size: 13px;
font-weight: 600;
padding: 2px 8px;
border: 1.5px solid #c0392b;
color: #c0392b;
background: rgba(192, 57, 43, 0.08);
border-radius: 0;
```

### Annotations (Image 3 style)
```css
font-family: 'Caveat', cursive;
font-size: 13px;
font-style: italic;
color: #7a6249;
```
Placed near elements with `←` or `→` arrows. Used to describe ingredients, textures, cooking notes.

### Journal / Voice Block
- Lined notebook background
- Red margin line at `left: 42px`
- Content indented `52px` from left
- Mix of Kalam (declarations) and Caveat (notes)

### Section Labels
```css
font-family: 'Kalam', cursive;
font-size: 12px;
font-weight: 700;
color: #9a856a;
letter-spacing: 2.5px;
text-transform: uppercase;
border-bottom: 1.5px dashed #c8b89a;
```

---

## Motion Principles

| Moment             | Behavior                                                              |
|--------------------|-----------------------------------------------------------------------|
| Wheel spin         | `cubic-bezier(0.25, 0.1, 0.08, 1)` over 1.9s — physical, snappy     |
| Watercolor reveal  | Recipe card appears with a top-band wash sweeping in (color-bleed)   |
| Ink draw-on        | Card borders animate as SVG stroke-dashoffset (drawn in real time)   |
| Annotation pop     | Ingredient callouts appear with a staggered 80–120ms handwritten delay|
| Button hover       | `translateY(-2px)` maintaining rotation                               |
| Wheel hover        | Subtle `rotate(4deg) scale(1.02)` preview                             |

No fades on UI elements. No glow or blur. Motion should feel physical and hand-made.

---

## Voice & Copy

- Declarative, never passive: "tonight you're making THIS." not "you might like…"
- Annotation style encouraged: use `←` arrows with short descriptions on ingredient/recipe details
- **Annotate like a food sketch** — short italic callouts next to ingredients
- CTAs: "Spin it." / "Let's cook!" / "Try again."
- Empty state: "Hungry? Spin it."
- Error: "Hmm. Try spinning again."

---

## What to Avoid

- No CSS `box-shadow` — use offset `::before` pseudo-element
- No `border-radius` on cards, buttons, or tags
- No Inter, Roboto, Arial, or system fonts
- No gradients on UI elements (watercolor washes are flat color fills with opacity, not CSS gradients)
- No perfectly centered symmetrical layouts — slight rotation and asymmetry is intentional
- No clean corporate aesthetics — every element should look like it could have been drawn by hand
