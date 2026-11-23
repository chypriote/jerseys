# Jerseys design language: "Kit wall"

A small app where Nico shows his football jersey collection and his wishlist. Viewers look; only Nico (the Owner) edits.

Direction chosen by Nico on 2026-11-22. Reference: [visual direction page](https://claude.ai/artifact/Pc2Ztut5qgQ2Z9PAE63CF1), variant A.

## 1. Visual theme

**Theme statement:** happy, sporty, kit wall.

**Character:** A full wall of football shirts. Sibling of the Vinyles "Wall" language: same structure and shapes, own palette and display type. Dials: Creativity=Balanced, Density=Packed, Variance=Uniform, Motion=Static (hover tilt only).

**References:** Vinyles "Wall" (structure, shapes, popup), a club shop wall of shirts (packed square tiles), pitch green and sky blue (palette), condensed italic shirt lettering (display type).

## 2. Color palette

| Token | Light | Dark |
|---|---|---|
| bg | #eef6ff | #101a3a |
| surface | #ffffff | #19254d |
| ink | #1a2f6b | #eef6ff |
| muted | #5a6a8e | #a3b1d9 |
| line | #d6e4f7 | #2a3a6e |
| accent (pitch green) | #1fbf75 | #3fd68c |
| on-accent | #101a3a | #101a3a |
| desire dots, covered country | #108a52 | #3fd68c |
| focus ring | #258dff | #5aa9ff |
| error (coral) | #c9342a | #ff6f63 |

- Chips: sun #ffc83d (jersey count), mint #34d3a0 (total spent, Got it), sky #5aa9ff (wishlist count). Chip text is always #1a2f6b.
- Overlay: rgb(10 18 50 / .75).
- Shadow base: rgb(26 47 107 / .12) light, rgb(0 0 0 / .35) dark.
- All text and focus pairs pass WCAG 2.2 AA. The accent #1fbf75 is 2.2:1 on the light page: use it only as a fill under on-accent text.
- Follow the system theme. `data-theme` overrides it.
- Token tiers and contrast values: [TOKENS.md](TOKENS.md).

## 3. Typography

Two families, both on Google Fonts:

- Display: Barlow Condensed 700 and 800, italic for headings and captions, always uppercase. Only short labels: page title, popup title, Team caption, tabs. Fallback: "Arial Narrow", system-ui, sans-serif.
- Body: Nunito 500, 700, 800. All running text, details and forms. Fallback: ui-rounded, system-ui, sans-serif.

Numbers use tabular-nums.

| Role | Family | Size / weight | Line height |
|---|---|---|---|
| h1 | Barlow Condensed italic, uppercase | 28 / 800 | 1.1 |
| Popup title | Barlow Condensed italic, uppercase | 24 / 800 | 1.1 |
| Tab label | Barlow Condensed, uppercase, +0.03em | 14 / 700 | 1.1 |
| Caption, Team | Barlow Condensed italic, uppercase, +0.02em | 14 / 800 | 1.25 |
| Caption, Season and Kit Type | Nunito, muted | 11 / 500 | 1.25 |
| Body | Nunito | 14 / 500 | 1.45 |
| Popup details | Nunito | 15 / 500 | 1.45 |

The scale is ad-hoc: a size not in this table does not appear in the app.

## 4. Components

- **Tile:** square, surface colour, 14px radius, offset shadow. It shows the Kit's Main Picture, contained. If the Kit has no Main Picture: a shirt outline in the muted colour.
- **Popup:** opens in the centre of the screen, as in Vinyles. Max width 420px, Main Picture 150px, X button at top right. Tap outside or Esc closes it. Forms use a wide Popup (672px), with the fields in two columns from 640px.
- **CoverageMap:** a surface card with a static world map, Collection page only. Two states per Country: covered (desire dots colour) and empty (line colour).
- **StickyBar:** title, chips, tab pills, search, filters, sort.
- **Controls:** Chip, Button, Tabs, SearchField, Select, ToggleGroup are pills.

Full catalog (all levels, props, states, Owner UI, empty states, import screen): [COMPONENTS.md](COMPONENTS.md). All components are planned: none is in code yet.

## 5. Layout

- **Grid:** 3 columns on phone, 5 from 640px, 7 from 900px, 8 from 1200px. Gap 8px across, 12px down.
- **Gutter:** 16px plus safe-area insets.
- **Space values:** 8, 12, 16px. No other spacing tokens yet.
- **Density:** packed.
- **Page order:** StickyBar, then (Collection only) CoverageMap, then the tile grid.
- **Sticky bar:** title, chips (Collection: jersey count and total spent; Wishlist: item count), tab pills (Collection, Wishlist), search, filters, sort.
- **Caption under each tile:** Team (display face), then "{Season} · {Kit Type}" (muted). Wishlist adds 5 desire dots.

## 6. Depth

| Level | Value | Used for |
|---|---|---|
| Flat | none | Page |
| Raised | 0 3px 0 shadow base | Tiles, chips, buttons, tabs, map card |
| Pressed | shadow 0, move down 3px | Button while pressed |

Depth is a soft offset shadow, never a blur.

Layering, bottom to top:

1. Page content
2. Sticky bar (z 10)
3. Page-colour strip over the top safe-area inset (z 20)
4. Popup: native `<dialog>` in the top layer, over the overlay colour

## 7. Do's and don'ts

### Do

- Keep the Main Picture contained on a neutral surface tile, with padding.
- Use the display face only for the roles in section 3.
- Use the desire dots colour (#108a52 light) for icons and thin marks, not the accent.
- Make every control at least 44px tall.
- Show the focus ring (3px, focus ring colour) on `:focus-visible`.
- Format numbers with tabular-nums.

### Don't

- Never fill a tile with the kit's colour.
- Never use purple, hard borders, mono type or the muted cream look.
- Never use a blur shadow.
- Never add a number or a sticker on a tile.
- Never let the page scroll sideways. Only the map card scrolls sideways.
- Never animate when `prefers-reduced-motion: reduce` is set.

## 8. Responsive

Mobile first.

| Element | Below 640px | From 640px |
|---|---|---|
| Tile grid | 3 columns | 5, then 7 from 900px, 8 from 1200px |
| Sticky bar search and filters | Behind icon toggle buttons | Shown in the bar |
| CoverageMap | Drawn 900px wide, card scrolls sideways, opens centred on Europe | Drawn at card width, 900px minimum |
| Popup | Centred on the screen; form fields in one column | Max width 420px; form Popup 672px, fields in two columns |

## 9. Motion

- Durations: fast 80ms (press), base 150ms (hover).
- Easing: cubic-bezier(.2, .8, .2, 1).
- Signature: hover or focus on a tile lifts it 3px and tilts it -1.5deg.
- Reduced motion: no transition. The state changes at once and the tile does not move.

## 10. Voice and tone

- Names come from [GLOSSARY.md](GLOSSARY.md): Jersey, Kit, Main Picture, Wishlist Item, Desire, Country. Use them in the UI and in code.
- Labels are short and plain: "Got it", "Drop", "Add", "Save", "Cancel".
- No "owner only" text in the UI.

## 11. Agent prompt guide

When you make UI for this app:

- Use semantic or component tokens from [TOKENS.md](TOKENS.md). Never put a raw hex or pixel value in component code.
- Use a component from [COMPONENTS.md](COMPONENTS.md) before you propose a new one. A new component goes into COMPONENTS.md first.
- Apply section 7 as hard rules.

Invariants. Do not change these without a change to this file:

- The Main Picture sits on a neutral tile. The kit's colour never fills the tile.
- Controls are pills with the raised shadow and no border.
- Display face for short labels only. Nunito for everything else.
- Light and dark both pass WCAG 2.2 AA.
