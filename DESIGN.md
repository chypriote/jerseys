# Jerseys design language: "Kit wall"

Theme: happy, sporty, kit wall. A full wall of football shirts. Sibling of the Vinyles "Wall" language: same structure and shapes, own palette and display type. Dials: Creativity=Balanced, Density=Packed, Variance=Uniform, Motion=Static (hover tilt only).

Never use purple, hard borders, mono type or the muted cream look. Never fill a tile with the kit's colour: the Cover must read on a neutral tile.

Direction chosen by Nico on 2026-11-22.

## Color tokens

| Token | Light | Dark |
|---|---|---|
| bg | #eef6ff | #101a3a |
| surface | #ffffff | #19254d |
| ink | #1a2f6b | #eef6ff |
| muted | #5a6a8e | #a3b1d9 |
| line | #d6e4f7 | #2a3a6e |
| accent (pitch green) | #1fbf75 | #3fd68c |
| on-accent | #101a3a | #101a3a |
| desire dots | #108a52 | #3fd68c |
| focus ring | #258dff | #5aa9ff |

- Chips: sun #ffc83d (jersey count), mint #34d3a0 (total spent, Got it), sky #5aa9ff (wishlist count). Chip text is always #1a2f6b.
- All text and focus pairs pass WCAG 2.2 AA. Token tiers: [TOKENS.md](TOKENS.md).
- Overlay: rgb(10 18 50 / .75).
- Shadow base: rgb(26 47 107 / .12).
- Follow the system theme. `data-theme` overrides it.

## Type

Two families, both on Google Fonts:

- Display: Barlow Condensed 800 italic, uppercase. Only short labels: page title, popup title, Team caption, tabs. Fallback: "Arial Narrow", system-ui.
- Body: Nunito 500, 700, 800. All running text, details and forms. Fallback: ui-rounded, system-ui.

Numbers use tabular-nums.

| Role | Family | Size / weight |
|---|---|---|
| h1 | Barlow Condensed italic, uppercase | 28 / 800 |
| Popup title | Barlow Condensed italic, uppercase | 24 / 800 |
| Tab label | Barlow Condensed, uppercase | 14 / 700 |
| Caption, Team | Barlow Condensed italic, uppercase | 14 / 800 |
| Caption, Season and Kit Type | Nunito | 11 / 500, muted |
| Body | Nunito | 14 / 500 |
| Popup details | Nunito | 15 / 500 |

## Shape and depth

- Tiles: 14px radius. Popup: 28px radius.
- Tabs, search, selects, chips, buttons: pill (999px).
- Depth is a soft offset shadow (0 3px 0), not a blur. Tiles carry it too.
- Hover or focus on a tile: lift 3px and tilt -1.5deg, only when motion is allowed.
- Focus ring: 3px, focus ring color.

## Layout

- Grid: 3 columns on phone, 5 from 640px, 7 from 900px, 8 from 1200px. Gap 8px across, 12px down. Side gutter 16px plus safe-area insets.
- Sticky bar: title, chips (collection: jersey count and total spent; wishlist: item count), tab pills (Collection, Wishlist), search, filters, sort.
- Caption under each tile: Team (display face), then Season and Kit Type (muted). Wishlist adds 5 desire dots.

## Components

- **Tile:** square, surface colour, 14px radius, offset shadow. It shows the Kit's Cover, contained. If the Kit has no Cover: a shirt outline in the muted colour.
- **Popup:** opens over the tapped tile, clamped to the screen. Max width 420px, Cover 150px, X button at top right. Tap outside or Esc closes it.

World map, sticky bar filters and sorts, popup content, Owner UI, empty states and the import screen: [COMPONENTS.md](COMPONENTS.md).

Reference: [visual direction page](https://claude.ai/artifact/Pc2Ztut5qgQ2Z9PAE63CF1), variant A.
