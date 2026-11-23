# Jerseys components: "Kit wall" v1

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Accepted by Nico on 2026-11-23.

Stack: same as Vinyles, SvelteKit (Svelte 5) with shadcn-svelte and Tailwind CSS v4. "Snippet" is a Svelte 5 slot. Props are camelCase; callbacks start with `on`. Where a component is the same as in Vinyles, this file says so and lists only the differences.

## Hierarchy

| Level | Components |
|---|---|
| Primitive | Chip, Button, SearchField, Select, Field, ToggleGroup |
| Component | Tile, Tabs, Popup, ConfirmDialog, CountryFilter, SortDirection, ThemeToggle, StoreSelect, TeamLookup, EmptyState |
| Pattern | StickyBar, TileGrid, CoverageMap, LoginAction, AddAction, DeleteAction, FormActions, AcquisitionFields, JerseyForm, WishlistItemForm, GotItForm |

## Shared rules

- Touch target: every control is at least `control.size.min` (44px).
- Focus: `outline.focus.width` in `color.outline.focus`, on `:focus-visible` only.
- Motion: hover tilt and lift only under `prefers-reduced-motion: no-preference`.
- Controls (pills) use `radius.control` and `shadow.raised`. No borders.
- Numbers use `font.numeric`.
- Components set no outer margin and no width. The pattern sets the layout.
- Display face (`font.family.display`) only for the roles DESIGN.md names. Everything else is Nunito.

---

## Primitives

### Chip

Same as Vinyles. Tones: `highlight` (jersey count), `success` (total spent), `info` (wishlist count). Not interactive.

| Prop | Type | Default | Description |
|---|---|---|---|
| tone | `'highlight' \| 'success' \| 'info'` | — | `color.bg.highlight`, `.success` or `.info` |
| label | string | — | "jerseys", "spent", "wanted" |
| value | string | — | Already formatted ("67", "4 120,00 €") |

### Button

Same as Vinyles. Intents `success` (Got it, Save, Log in), `neutral` (Drop, Cancel) and `danger` (the Delete Button of DeleteAction, `color.bg.danger`). Also `size="icon"` for the icon pills (search toggle, filter toggle, sort order, lock, theme): a visually hidden label is required.

States: default, hover (8% state layer of the text color), focus, pressed (shadow to 0, move down 3px), disabled (50% opacity, no shadow).

### SearchField

Native `<input type="search">`. Searches the Team name and the Print. Label (visually hidden): "Search team or print".

### Select

Native `<select>`, styled as a pill. Used for sort.

### Field

SearchField, Select and Field share one look: fill `color.bg.field`, a 2px `color.border.field` border, a pill with `shadow.raised`. They stand out from the page and from the Popup in light and dark (contrast ratios in TOKENS.md).


Same as Vinyles: visible label, native input, `error` text in `color.text.error`, linked with `aria-describedby`. Types: `text`, `password`, `number`.

Dates in this app can be a year only (GLOSSARY: Purchase). So a date Field is `type="text"` with no `inputmode` (the iOS number pad has no "-"), placeholder "2024 or 2024-05-12", and the form checks the pattern `YYYY` or `YYYY-MM-DD`. Native `type="date"` cannot hold a year only.

### ToggleGroup

The shadcn-svelte toggle group, as radio pills, `type="single"`. Used for Version, Size, Fit, Kit kind and Acquisition. Selected: `color.bg.accent` + `color.text.on-accent`.

---

## Components

### Tile

**Purpose:** One Jersey (Collection) or one Wishlist Item (Wishlist) in the grid. It opens the Popup.

| Prop | Type | Default | Description |
|---|---|---|---|
| team | string | — | Caption line 1, `text.caption.team` |
| season | string | — | Already formatted ("2023-24", "2024") |
| kitType | string | — | "Home", "Away"… Caption line 2 is "{season} · {kitType}", `text.caption.kit` |
| mainPictureUrl | string \| null | null | The Kit's Main Picture. Null shows the shirt outline |
| print | string \| null | null | The Jersey's Print, as on the shirt. Null for a Jersey without a Print and a Wishlist Item |
| number | string \| null | null | Shirt number of the Jersey's Print: its trailing digits ("NICOLAS 4" gives "4"). Null for a Print without a number, a Jersey without a Print and a Wishlist Item |
| onSelect | `(el: HTMLElement) => void` | — | Gives the Popup the Tile to focus on close |

- The whole Tile is one `<button>`. The image has `alt=""`, because the caption names the Kit.
- Square box: `tile.bg`, `tile.radius`, `tile.shadow`. The Main Picture is `object-fit: contain` with padding, so a shirt photo on any background reads on the neutral tile. `loading="lazy"`.
- No Main Picture, or the image fails to load: a shirt outline SVG in `tile.placeholder`, `aria-hidden`.
- The Print sits bottom center of the square box on one line, truncated with an ellipsis, 28px in from each side so it never reaches the number (`bottom` 4px), `text.tile.print`, `color.text.primary`, 3px halo in `tile.bg`. `aria-hidden`.
- The number sits at the bottom right of the square box (6px from the right, 2px from the bottom), `text.tile.number`, `color.text.primary`, with a 4px halo in `tile.bg` so it reads on every shirt. It is `aria-hidden`: the Popup lists the full Print.
- Never fill the tile with a kit colour (DESIGN.md).

States: default, hover and focus (`tile.hover.lift`, `tile.hover.tilt`, motion allowed only; focus also shows the ring), no Main Picture.

### Tabs

Same as Vinyles: two links, `/` (Collection) and `/wishlist`, not an ARIA tab widget. Label text: `text.label.tab`. Current: `color.bg.accent` + `color.text.on-accent`, `aria-current="page"`.

### Popup

Same as Vinyles: native `<dialog>` with `showModal()`, centred on the screen. Focus goes back to `anchor` on close. Title: `text.heading.popup`.

| Prop | Type | Default | Description |
|---|---|---|---|
| open | boolean | false | Bindable |
| anchor | HTMLElement \| null | null | The Tile. Gets the focus back on close |
| title | string | — | The Team name |
| subtitle | string | — | "{season} · {kitType}", `text.body.detail`, muted |
| mainPictureUrl | string \| null | null | `popup.picture.size`, contained, or the shirt outline |
| pictureUrls | string[] | `[]` | The Kit's extra Pictures, in the order they were added (see "Popup content") |
| wide | boolean | false | Form Popup: width `popup.width.wide`, no Main Picture. From `breakpoint.sm` the fields sit in two columns |
| onDismiss | `() => void` | — | X button, Esc, tap on the backdrop |
| pictureAction | Snippet (index) | — | Owner only: under the thumbnails while a Picture (not the Main Picture) is shown. Gets the Picture's index in `pictureUrls` |

Vinyles names the title prop `album`. Here it is `title`, because a Popup also holds forms.

Slots:
- `details`: a `<dl>` of rows. The page fills it (see "Popup content").
- `actions`: optional, Owner only.
- `findPicturesUrl`: optional, Owner only: the "Find pictures on Football Kit Archive" link under the Buttons. The Edit Kit and Set main picture Popups pass it.

### ConfirmDialog

Same as Vinyles: the shadcn-svelte alert dialog, over the Popup. Title "Delete {what}?", a line of `text.body.detail` in `color.text.muted` on what goes, then Buttons `neutral` "Cancel" and `neutral` "Delete". Esc and "Cancel" close it and change nothing. "Delete" closes it and runs the delete.

| Prop | Type | Default | Description |
|---|---|---|---|
| open | boolean | false | Bindable |
| title | string | — | "Delete Lyon 2023-24 · Home?" |
| text | string | — | What the delete removes |
| actionLabel | string | — | "Delete" |
| onConfirm | `() => void` | — | |

### CountryFilter

**Purpose:** Filter a list by Country.

Same shape as the Vinyles ArtistFilter: a `<details>` pill with checkboxes. Summary: "All countries ({n})" or "Countries ({n})". Countries are grouped under their Continent heading. Each heading has a checkbox that selects or clears all the Countries of that Continent (checked when all are selected, indeterminate when some are). A "Clear filter" Button stays at the top of the open list while it scrolls; it is disabled when nothing is selected. Only Countries that have at least one Tile on this page are listed. A Jersey matches its Country by Coverage rules: the National Team's Country, or the Club's League's Country.

| Prop | Type | Default | Description |
|---|---|---|---|
| value | string[] | `[]` | Bindable Country ids. Empty = all |
| groups | `{ continent: string; countries: { id: string; name: string }[] }[]` | — | |

### SortDirection, ThemeToggle

Same as Vinyles.

### StoreSelect

Same as Vinyles: native Select over the Stores and a last option "Add a store…".

### TeamLookup

**Purpose:** Pick a known Team, or add a new Team on the fly, in JerseyForm and WishlistItemForm.

- A text Field "Team" with the ARIA combobox pattern (`role="combobox"`, `aria-autocomplete="list"`, a `role="listbox"` under it).
- Typing filters the known Teams by name (contains, any case), up to 8 options, each with its Country in `color.text.muted`.
- When the text matches no Team exactly, the last option is "Add “{name}” as a new team", in `color.icon.accent`.
- Keys: Up and Down move, Enter picks, Esc closes the list (not the Popup). A click picks.
- Picking the new option opens a block under the Field: kind (ToggleGroup Club / National Team, default Club) and Country (Select, grouped by Continent, required). Text under it: "The League follows the Country." Save creates the Team with the Jersey or Wishlist Item.
- A new Team name is searched on TheSportsDB (`/api/teams/search`) on the first Save of the form, and in the Teams page "Add a team" Popup. When no Team matches (case, accents and punctuation ignored; one name inside the other counts), the form shows "“{name}” is not on TheSportsDB. Save again to add it anyway." and a second Save adds it. A failed search never blocks. Football Kit Archive cannot be the check: it refuses server requests.
- Typing again after a pick closes the block until a new pick.
- The list is a `color.bg.surface` card, `tile.radius`, `shadow.raised`. Options are 44px pills; the active one has `color.bg.page`.

| Prop | Type | Default | Description |
|---|---|---|---|
| value | `{ teamId: string } \| { name: string; kind: 'club' \| 'national'; countryId: string }` | — | Bindable. A known Team or a new one |
| teams | `{ id: string; name: string; country: string }[]` | — | Known Teams |
| countries | same as CountryFilter `groups` | — | For the new Team's Country |

### EmptyState

Same as Vinyles. Messages: "No jerseys yet", "Nothing on the wishlist", "No match" with a "Clear filters" Button. No illustration.

---

## Patterns

### StickyBar

Same structure as the current Vinyles StickyBar (title row; tabs row; search and filters row, behind icon toggles below `breakpoint.sm`).

- Title: "Jerseys" in `text.heading.page`, on the left of the title row. The chips, the LoginAction and the ThemeToggle sit on the right of it, as in Vinyles; they wrap under the title when the row is too narrow.
- Collection chips: `highlight` jersey count, `success` total spent. Filters: CountryFilter. Sorts: Team, Season, Acquired (Bought date or Gift date). Default: Acquired, newest first.
- Wishlist chips: `info` item count. Filters: CountryFilter. Sorts: Team, Season. Default: Season, newest first.
- Search covers Team name and Print.

### TileGrid

Same as the Vinyles CoverGrid: `grid.columns` per breakpoint, gaps `space.grid.gap-x` and `space.grid.gap-y`, gutter `space.gutter` plus safe-area insets. Key each Tile by Jersey id or Wishlist Item id. Two Jerseys of one Kit are two Tiles with the same Main Picture.

### CoverageMap

**Purpose:** Shows which Countries are covered. Collection page only, between the StickyBar and the TileGrid.

- A surface card (`color.bg.surface`, `tile.radius`, `tile.shadow`) with an inline SVG world map. Height follows the map's aspect ratio.
- Size: small Countries must be easy to see (Nico, 2026-11-22). The map is cropped to 56°S–72°N (no Antarctica, no far north). It is drawn at least `map.width.min` (900px) wide. On a narrower screen the card scrolls sideways (`overflow-x: auto`) and opens centred on Europe; the page itself never scrolls sideways.
- Small Countries: a Country less than 8px across at the drawn size also gets a dot (r 4px) at its centre, in its state colour, with a 1px `map.country.border` ring. This covers Hong Kong, Luxembourg, Malta and the like.
- Two states per Country (jerseys-model): covered fills `map.country.covered`; empty (a Country of the app with no Jersey) fills `map.country.empty`, a bit darker than land that is not a Country of the app (`map.country.absent`). Country borders: `map.country.border`, 0.5px.
- The UK is four Countries: England, Scotland, Wales, Northern Ireland.
- Heading above the map: "{covered} of {total} countries", `text.body`, value in extrabold. It is the button of an accordion with a chevron: it opens and closes the map (`aria-expanded`). The map starts open; the choice is kept in `localStorage` (`coverage-map-open`) and applied after mount. `total` is the number of Countries in the app, not in the world.
- The SVG is `role="img"` with `aria-label` "Countries covered: {names}". No zoom in v1: sideways scroll only.
- Click or tap on a covered Country: the page's Country filter becomes that Country alone, the search is cleared, and the page scrolls smoothly to the first Tile shown. Covered Countries show a pointer cursor; others do nothing.
- Hover (mouse and pen only): over a Country of the app, a tooltip follows the pointer with the Country name in extrabold and one line per Jersey of that Country, "{Team} {Season} {Kit Type}", or "No jersey yet". Surface card, `tile.shadow`, `text.body.detail`; it flips to the other side of the pointer in the far half of the screen. Countries not in the app show nothing.
- The map reads all Jerseys, not the filtered list.

New component tokens (add to TOKENS.md):

| Token | → Semantic | Scope |
|---|---|---|
| map.country.covered | color.icon.accent | CoverageMap |
| map.country.empty | sky.200 / navy.500 | CoverageMap |
| map.country.absent | color.border.subtle | CoverageMap |
| map.country.border | color.bg.surface | CoverageMap |
| map.width.min | 900px | CoverageMap drawing |

Contrast, covered against empty: 3.41 light, 5.81 dark (needs 3, non-text). Empty against the card is low (1.29 light, 1.36 dark), but it shows only the land shape; the covered state and the text label carry the information.

### Popup content

Rows are `<dt>` label, `<dd>` value, `text.body.detail`. A row with no value is not shown.

- **Jersey:** Version, Print, Size, Fit, then the Acquisition. Purchase: Store, Price, Bought, Sent, Received. Gift: "Gift", Date, From. Dates show as stored: "2024" or "12 May 2024".
- **Wishlist Item:** Version (or "Any version"). Owner `actions`: Button `success` "Got it", Button `neutral` "Drop". Drop acts at once, with no confirmation, as in Vinyles.
- Owner on a Jersey: a `neutral` Button "Edit" and a `danger` Button "Delete" in `actions`. "Edit" opens JerseyForm in the same Popup. "Delete" (DeleteAction) removes the Jersey and closes the Popup; the Kit stays, even with no Jersey left.
- **Pictures** (Jersey and Wishlist Item): when the Kit has extra Pictures, a row of small contained thumbnails (`control.size.min` square, `color.bg.page` tile) sits under the Main Picture: the Main Picture first, then the Pictures in the order they were added. A tap shows that Picture in place of the Main Picture; the shown thumbnail has the focus outline (`aria-pressed`). Every Jersey and the Wishlist Item of a Kit show the same Pictures.
- Owner, while a Picture is shown: a `neutral` Button "Delete" under the thumbnails (DeleteAction, "Delete this picture?"). It removes the Picture and its image for every Jersey and the Wishlist Item of the Kit.
- Owner on a Jersey or a Wishlist Item: a file input "Add pictures" (multiple, JPEG, PNG or WebP) after the Buttons in `actions`. Each file is shrunk like the Main Picture and added at once, in the order picked; a refused file shows its error under the input.

### LoginAction, AddAction

Same as Vinyles. LoginAction: lock icon Button (Viewer) or nothing extra (Owner). AddAction: `success` Button "Add" next to the Tabs, Owner only. It opens JerseyForm (Collection) or WishlistItemForm (Wishlist) in the Popup.

### DeleteAction

A `danger` Button "Delete" (visually hidden: the row's name) that opens ConfirmDialog. After "Delete" it runs the delete. A refused delete shows its error under the Buttons, in `color.text.error`, and the row stays: "Kitbag is still used by 2 Purchases", "France is still used by 3 Teams", "Lyon is still used by 4 Kits", "Lyon 2023-24 Home is still used by 1 Jersey and 1 Wishlist Item", "The Official Store cannot be deleted".

Delete fixes a mistake (Nico, 2026-11-23). It refuses, never cascades: a Store with Purchases, a Country with Teams, a Team with Kits, a Kit with Jerseys or a Wishlist Item stay. Deleting a Country deletes its League. Deleting a Kit deletes its Pictures and its Main Picture and Picture images. No undo, no trash.

### Admin sections

Owner only. `/admin` redirects to `/admin/countries`. One page per section: `/admin/countries`, `/admin/stores`, `/admin/teams`, `/admin/kits`, `/admin/main-pictures` (Kits without a Main Picture). A nav under the title (AdminNav, styled like Tabs) links the pages and marks the current one with `aria-current="page"`. Each page has a SearchField above its list that filters the loaded rows by every word typed (page state, not in the URL). The Countries, Stores and Teams rows end their subtitle with the Jersey count ("3 jerseys"; Jerseys only, a Gift counts for no Store). The Edit team Popup lists the Team's Kits under the form, each a link to `/admin/kits?search=<Team Season Kit Type>`; the Kits page starts with that text in its SearchField. The Edit kit Popup ends with a link "Edit {Team name}" to `/admin/teams?search=<Team name>`; the Teams page starts with that text in its SearchField. The Teams page has a `success` Button "Add a team" next to its heading: the same Popup as Edit team, with no DeleteAction and no Kits list; Save creates the Team (no Kit) and goes to `/admin/kits?addKit=<Team id>`, which opens the Add kit Popup with that Team pre-filled. The Edit team Popup has the same link, "Add a kit to {Team name}", above its Kits list. The Kits page has a `success` Button "Add a kit" next to its heading: a wide Popup with the Kit fields of JerseyForm (Team, Season, Kit Type, Comment for a Special Kit, Main Picture) and FormActions; Save creates the Kit, with the Main Picture lookup unless a picture is sent. A Kit that exists is refused. The Kits rows show the Main Picture in a small square tile on the left (the shirt outline when there is none), with no subtitle. The Stores are small cards in a grid, two per row on a phone and three from `breakpoint.sm`: name and Jersey count on the left, then a round pencil icon Button (`size="icon"`, label "Edit {store name}") on the right, vertically centred. The Name of a new Country is a typeahead (CountryNameLookup, the TeamLookup pattern) over the Countries of the map, 8 options at most, and the server refuses a name that is not one of them; editing a Country keeps a plain Name field. Each row has a Button that opens its form in a Popup ("Edit"). The Popup of an existing Country, Store, Team or Kit ends with one footer row (FormActions): DeleteAction on the left, `success` Button "Save" on the right, each at its natural width. The Add Popups have the Save Button alone, on the right. The Edit Kit Popup also has the "Find pictures on Football Kit Archive" link. A delete closes the Popup.

### FormActions

The footer row of an admin form: an optional `remove` slot (DeleteAction) on the left and a `success` Button "Save" with `loading` on the right (`busy`). The row wraps on a narrow screen. A refused delete shows its error on its own line under the row.

### AcquisitionFields

Like Vinyles, plus dates:

- ToggleGroup Purchase / Gift.
- Purchase: StoreSelect, Price (Field `number`, step 0.01, required), Bought (date Field, required), Sent (date Field, optional), Received (date Field, optional).
- Gift: Date (date Field, required), From (Field, optional).

### JerseyForm

Add and edit a Jersey. Fields, in order:

1. Team: TeamLookup.
2. Season: Field. Placeholder from the Team's Season Format: "2024-25" (Season) or "2024" (Calendar).
3. Kit Type: Select (Home, Away, Third, Fourth, Cup, Special).
4. Main Picture: file input "Main picture", shown when the Kit has no Main Picture yet. One Main Picture per Kit.
5. Version: ToggleGroup Fan / Player / Tracksuit.
6. Size: ToggleGroup S / M / L.
7. Fit: ToggleGroup Too small / Good / Too big.
8. Print: Field, optional, any script.
9. AcquisitionFields.

Buttons: `success` "Save", `neutral` "Cancel". Delete is in the Jersey Popup (see "Popup content"), not in the form.

### WishlistItemForm

Team, Season, Kit Type (as in JerseyForm), Main Picture (same rule), Version (ToggleGroup Any / Fan / Player / Tracksuit). If Nico already owns a Jersey of the Kit: notice "Already owned" and a Button "Add anyway" before it saves.

### GotItForm

Opens from "Got it". Version (pre-set from the Wishlist Item, if any), Size, Fit, Print, AcquisitionFields. Save removes the Wishlist Item and creates the Jersey.

---

## Governance note

One owner, no Figma library, no ticket tool. Nico accepts this file, then the code follows it. Versioning starts when the first component ships.
