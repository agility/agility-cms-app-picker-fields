# Picker Fields — Marketplace listing copy

Written to match the structure of the existing Marketplace app docs (see
`agilitycms.com/docs/apps/power-fields`, the closest sibling).

---

## Summary line

> The Picker Fields app brings 6 new field types to Agility: icon pickers for
> Lucide, Heroicons, Font Awesome and Simple Icons, plus a hex color picker and
> a named color picker.

## Short description

For the app manifest and the install screen, where space is tight:

> Six custom fields for picking icons and colors. Browse and search four icon
> libraries, or pick a color visually. Every field stores a plain text value.

---

## What is the Picker Fields app?

The Picker Fields app brings 6 new field types to Agility:

- **Icon — Lucide**
- **Icon — Heroicons**
- **Icon — Font Awesome**
- **Icon — Simple Icons (brands)**
- **Color — Hex**
- **Color — Named**

Icons and colors are the two things that usually end up as a plain text box, with
the editor expected to remember that the value is `arrow-right` and not
`arrow_right` or `ArrowRight`. These fields replace that box with a picker:
editors browse and search the library visually, and the field writes the exact
value your front end expects.

There is nothing to configure. The app has no settings and no API keys — install
it and the six fields are available.

## Installing the Picker Fields App

In order to use an App in Agility, you need to install it in your instance. You
can do this from the Marketplace under **Settings > Apps**.

## Using the Picker Fields App

After installing the Picker Fields App, you can create Content Models or Page
Modules that use any of the six field types it provides.

Each icon field opens a browser showing every icon in its library, with search
and — for libraries that have styles — a filter for the style. Font Awesome
carries 2,800 icons and Simple Icons over 3,400, so search is the fastest way in.
The selected icon is shown in the field, and can be cleared at any time.

The two color fields work the same way. **Color — Hex** offers a saturation
square, a hue slider, a text box for typing or pasting a value, and — in
Chromium browsers — an eyedropper for picking a color from anywhere on screen.
**Color — Named** lists the 148 CSS named colors, ordered by appearance rather
than alphabetically, so the blues sit together and a color can be found by eye.

## Outputting Content from Picker Fields on your Website

Every Picker Field stores a **plain text string**, never JSON. A front end can
use the value directly, and a field can be switched to or from an ordinary text
field without migrating any content.

| Field | Example stored value |
|---|---|
| Icon — Lucide | `arrow-right` |
| Icon — Heroicons | `outline/academic-cap` |
| Icon — Font Awesome | `solid/star`, `brands/github` |
| Icon — Simple Icons (brands) | `github` |
| Color — Hex | `#0F62FE` |
| Color — Named | `rebeccapurple` |

### Icon fields

**Lucide** and **Simple Icons** store the icon's name on its own. With
`lucide-react`, convert the kebab-case name to the exported component name:

```tsx
import { icons } from "lucide-react"

const toPascal = (name: string) =>
  name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("")

export const Icon = ({ name }: { name: string }) => {
  const Cmp = icons[toPascal(name) as keyof typeof icons]
  return Cmp ? <Cmp /> : null
}
```

**Heroicons** and **Font Awesome** store the style and the name separated by a
slash, because the same name exists in more than one style. Split on the `/` and
use the style to pick the import path or CSS class:

```tsx
const [style, name] = value.split("/")        // "solid/star"
const className = `fa-${style} fa-${name}`    // Font Awesome CSS
```

### Color fields

Both color fields store a value that CSS accepts as-is, so it can go straight
into a style or a custom property:

```tsx
<div style={{ "--accent": colorValue } as React.CSSProperties} />
```

**Color — Hex** always stores the 6-digit `#RRGGBB` form. It never produces the
8-digit `#RRGGBBAA` form, because 8-digit hex is not safe everywhere a value
might land — older Safari, email clients, and anything that parses the value
itself rather than handing it to a browser.

## Icon licensing

Icons are redistributed from their upstream packages, under their own licences:
Lucide (ISC), Heroicons (MIT), Font Awesome Free (CC BY 4.0) and Simple Icons
(CC0 1.0).

Simple Icons are brand logos. Using one is not a licence to use the brand it
represents — check the brand's own guidelines before publishing.
