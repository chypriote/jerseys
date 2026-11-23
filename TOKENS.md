# Jerseys tokens: "Kit wall"

Source of truth: [DESIGN.md](DESIGN.md). This file puts its values into three tiers: Primitive → Semantic → Component. Component code uses only semantic or component tokens, never a primitive.

Modes: light and dark swap the semantic → primitive bindings. Primitives stay the same in both modes. The system theme picks the mode; `data-theme` overrides it.

## Primitives

### Color

| Token | Value | Notes |
|---|---|---|
| color.white | #ffffff | |
| color.sky.50 | #eef6ff | |
| color.sky.100 | #d6e4f7 | |
| color.sky.200 | #c9daf1 | |
| color.sky.400 | #5aa9ff | |
| color.sky.600 | #258dff | |
| color.navy.300 | #a3b1d9 | |
| color.navy.500 | #3a4d88 | |
| color.navy.600 | #5a6a8e | |
| color.navy.700 | #2a3a6e | |
| color.navy.800 | #1a2f6b | |
| color.navy.900 | #19254d | |
| color.navy.950 | #101a3a | |
| color.green.400 | #3fd68c | |
| color.green.500 | #1fbf75 | |
| color.green.700 | #108a52 | Icons on light page |
| color.sun.400 | #ffc83d | |
| color.mint.400 | #34d3a0 | |
| color.coral.400 | #ff6f63 | Same as Vinyles coral.400 |
| color.coral.600 | #c9342a | Darker than Vinyles coral.600, to pass as text |
| color.scrim | rgb(10 18 50 / .75) | Overlay |
| color.shadow | rgb(26 47 107 / .12) | navy.800 at 12% |
| color.shadow.dark | rgb(0 0 0 / .35) | |

### Typography

| Token | Value |
|---|---|
| font.family.display | "Barlow Condensed", "Arial Narrow", system-ui, sans-serif |
| font.family.base | Nunito, ui-rounded, system-ui, sans-serif |
| font.weight.medium | 500 |
| font.weight.bold | 700 |
| font.weight.extrabold | 800 |
| font.size.2xs | 11px |
| font.size.sm | 14px |
| font.size.md | 15px |
| font.size.lg | 24px |
| font.size.xl | 28px |
| font.size.number | 26px |
| font.line-height.tight | 1.1 |
| font.line-height.snug | 1.25 |
| font.line-height.normal | 1.45 |
| font.numeric | tabular-nums |

### Space, radius, shadow, size

| Token | Value |
|---|---|
| space.200 | 8px |
| space.300 | 12px |
| space.400 | 16px |
| radius.md | 14px |
| radius.xl | 28px |
| radius.full | 999px |
| shadow.offset.sm | 0 3px 0 {color.shadow} |
| shadow.offset.sm.dark | 0 3px 0 {color.shadow.dark} |
| size.outline.md | 3px |

### Motion

| Token | Value |
|---|---|
| duration.fast | 80ms |
| duration.base | 150ms |
| easing.out | cubic-bezier(.2, .8, .2, 1) |

### Layers (z-index)

| Token | Value | Used for |
|---|---|---|
| layer.sticky | 10 | StickyBar |
| layer.safe-area | 20 | Page-color strip over the top safe-area inset |

### Breakpoints

| Token | Value |
|---|---|
| breakpoint.sm | 640px |
| breakpoint.md | 900px |
| breakpoint.lg | 1200px |

## Semantic bindings

### Color

| Semantic token | Light → | Dark → | Used for |
|---|---|---|---|
| color.bg.page | sky.50 | navy.950 | Page background |
| color.bg.surface | white | navy.900 | Tiles, popup |
| color.text.primary | navy.800 | sky.50 | Ink |
| color.text.muted | navy.600 | navy.300 | Season and Kit Type caption |
| color.border.subtle | sky.100 | navy.700 | "line" |
| color.bg.field | sky.50 | navy.950 | Input, select and search fill (the page colour: darker than the dark popup) |
| color.border.field | navy.600 | navy.300 | Input, select and search border, 2px. 3:1 or more against the fill and the surface (WCAG 1.4.11): 5.4:1 on white, 5.0:1 on sky.50, 7.0:1 on navy.900, 8.0:1 on navy.950 |
| color.bg.accent | green.500 | green.400 | Active tab pill |
| color.text.on-accent | navy.950 | navy.950 | Text on accent |
| color.icon.accent | green.700 | green.400 | Covered country on the CoverageMap |
| color.bg.highlight | sun.400 | sun.400 | Jersey count chip |
| color.bg.success | mint.400 | mint.400 | Total spent chip, Got it |
| color.bg.info | sky.400 | sky.400 | Wishlist count chip |
| color.text.on-chip | navy.800 | navy.800 | Text on sun, mint, sky |
| color.text.error | coral.600 | coral.400 | Field error text |
| color.bg.danger | coral.600 | coral.400 | Delete Button |
| color.text.on-danger | white | navy.950 | Text on danger (5.2:1 light, 6.3:1 dark) |
| color.outline.focus | sky.600 | sky.400 | Focus ring |
| color.bg.overlay | scrim | scrim | Behind the popup |

### Type roles

| Semantic token | Family → | Size → | Weight → | Line height → | Style |
|---|---|---|---|---|---|
| text.heading.page | display | xl | extrabold | tight | italic, uppercase |
| text.heading.popup | display | lg | extrabold | tight | italic, uppercase |
| text.label.tab | display | sm | bold | tight | uppercase, +0.03em |
| text.caption.team | display | sm | extrabold | snug | italic, uppercase, +0.02em |
| text.caption.kit | base | 2xs | medium | snug | muted |
| text.tile.number | display | number | extrabold | none | italic |
| text.body | base | sm | medium | normal | |
| text.body.detail | base | md | medium | normal | |

### Shape, depth, space, motion

| Semantic token | Light → | Dark → |
|---|---|---|
| radius.control | radius.full | same |
| shadow.raised | shadow.offset.sm | shadow.offset.sm.dark |
| outline.focus.width | size.outline.md | same |
| space.gutter | space.400 | same |
| space.grid.gap-x | space.200 | same |
| space.grid.gap-y | space.300 | same |
| motion.hover | duration.base + easing.out | same |
| motion.press | duration.fast + easing.out | same |

Under `prefers-reduced-motion: reduce`, there is no transition: the state changes at once and the tile does not move.

## Component tokens

| Token | → Value or semantic | Scope |
|---|---|---|
| tile.bg | bg.surface | Tile |
| tile.radius | radius.md | Tile |
| tile.shadow | shadow.raised | Tile |
| tile.placeholder | text.muted | Shirt outline when the Kit has no Main Picture |
| tile.hover.lift | -3px (translateY) | Tile, motion allowed only |
| tile.hover.tilt | -1.5deg (rotate) | Tile, motion allowed only |
| popup.radius | radius.xl | Popup |
| popup.width.max | 560px | Popup |
| popup.width.wide | 672px | Form Popup |
| popup.picture.size | 150px | Popup |
| control.size.min | 44px | All controls (touch target) |
| grid.columns | 3; 5 from breakpoint.sm; 7 from breakpoint.md; 8 from breakpoint.lg | Tile grid |
| map.country.covered | icon.accent | CoverageMap |
| map.country.empty | sky.200 (light), navy.500 (dark) | CoverageMap, Country of the app with no Jersey |
| map.country.absent | border.subtle | CoverageMap, land that is not a Country of the app |
| map.country.border | bg.surface | CoverageMap |
| map.country.border.width | 0.5px | CoverageMap |
| map.width.min | 900px | CoverageMap drawing |

Tabs, search, selects, chips and buttons use `radius.control`. Chips and buttons use `shadow.raised`.

## Flags

### Contrast (WCAG 2.2 AA)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| text.primary on bg.page | 11.58 | 15.65 | 4.5 |
| text.muted on bg.page | 4.96 | 8.00 | 4.5 |
| text.muted on bg.surface | 5.40 | 6.97 | 4.5 |
| text.on-accent on bg.accent | 7.12 | 9.11 | 4.5 |
| icon.accent on bg.page | 4.03 | 9.11 | 3 (non-text) |
| outline.focus on bg.page | 3.04 | 6.95 | 3 (focus ring) |
| text.on-chip on sun, mint, sky | 8.17, 6.60, 5.14 | same | 4.5 |
| text.error on bg.page | 4.81 | 6.26 | 4.5 |
| text.error on bg.surface | 5.24 | 5.45 | 4.5 |
| map.country.covered on map.country.empty | 3.09 | 4.32 | 3 (non-text) |

green.500 on the light page is 2.2:1. Use it only as a fill under on-accent text, never for icons or thin marks: those use `color.icon.accent`.
