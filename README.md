# Power Pickers

Agility CMS custom fields for the two things that are always, in the end, a plain
text box: **icons** and **colors**.

Six fields, in one app:

| Field | Route | Stored value |
|---|---|---|
| Icon — Lucide | `/fields/icon-lucide` | `arrow-right` |
| Icon — Heroicons | `/fields/icon-heroicons` | `outline/academic-cap` |
| Icon — Font Awesome | `/fields/icon-fontawesome` | `solid/star`, `brands/github` |
| Icon — Simple Icons (brands) | `/fields/icon-simple-icons` | `github` |
| Color — Hex | `/fields/color-hex` | `#0F62FE` |
| Color — Named | `/fields/color-named` | `rebeccapurple` |

Every value is a **plain string**, not JSON. That is the point: a front end can
use the value directly, and a field can be switched to or from a normal text
field without a migration.

---

## Installing in Agility

1. Deploy this app anywhere that serves it over HTTPS (Vercel, Netlify, a
   container — it has no server-side state and no database).
2. In Agility: **Settings → Apps → Add a Private App**, and give it the base URL.
3. Agility reads `/.well-known/agility-app.json` and the six fields appear as
   custom field types on any content model.

Open the app's base URL in a browser to check a deployment: it lists the fields
it is serving and links to its own manifest.

### App config values

Set on the app install; they reach every field.

| Name | Effect |
|---|---|
| `brandSwatches` | Quick-pick swatches in both color fields. `#0F62FE` or `Brand Blue #0F62FE`, comma or newline separated. |
| `hexAllowAlpha` | `true` adds an opacity slider to the Hex field. Off by default — see *Transparency* below. |
| `namedColorSet` | Replaces the CSS named colors with your own tokens: `brand-blue #0F62FE, brand-ink #101828`. |

Anything unparseable in these is dropped silently. A typo costs one swatch, not
the whole field.

---

## Using the values on a front end

**Lucide**, with `lucide-react` — the value is the kebab-case name, so map it to
the exported component:

```tsx
import { icons } from "lucide-react"

const toPascal = (name: string) =>
  name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("")

export const Icon = ({ name }: { name: string }) => {
  const Cmp = icons[toPascal(name) as keyof typeof icons]
  return Cmp ? <Cmp /> : null
}
```

**Heroicons** and **Font Awesome** — split on the `/` and use the style to pick
the right import path or CSS class:

```tsx
const [style, name] = value.split("/")        // "solid/star"
const className = `fa-${style} fa-${name}`    // Font Awesome CSS
```

**Colors** go straight into a style or a CSS custom property:

```tsx
<div style={{ "--accent": colorValue } as React.CSSProperties} />
```

### Transparency

The Hex field stores `#RRGGBB` and only ever produces the 8-digit `#RRGGBBAA`
form when `hexAllowAlpha` is on **and** the color is not fully opaque. It is off
by default because 8-digit hex is not safe everywhere it might land — older
Safari, email clients, and anything that parses the value itself rather than
handing it to a browser.

---

## Local development

```bash
npm install
npm run dev        # http://localhost:3060
```

A custom field is an iframe that talks `postMessage` to the Agility Manager App.
Opened on its own it never finishes initializing, so it says so and stops.

To actually drive the fields, use the bundled stand-in host:

**http://localhost:3060/dev-host**

It implements the host half of the protocol — the initialize/context handshake,
`setFieldValue` and its echo back through the field listener, `setHeight`,
`setFocus`, and the `openModal`/`closeModal` round trip — and shows the stored
value, the message log, and editable app config values. It is a copy of the parts
of `useAppSurfaceMessages.ts` (in `agility-cms-manager-app-react`) that these
fields use, and it does not exist in a production build.

It is not a test of Agility itself. A field that works there can still fail in
the CMS if the real host differs; it just fails far less often.

---

## How the icons get here

`scripts/build-icons.mjs` runs on `predev` and `prebuild`. It reads the four icon
packages out of `node_modules` and writes, per library:

```
public/icons/<lib>/index.json              the searchable catalogue
public/icons/<lib>/svg/[<style>/]<name>.svg one normalised file per icon
```

Roughly 9,700 SVGs, about 40 MB. **All of it is gitignored** — it is a build
artifact, and re-running the script is the only way to change it.

Two decisions worth knowing before changing this:

- **The SVGs are separate files, not one bundle.** The grid lazy-loads them one
  `<img>` at a time. Inlining Simple Icons' 3,460 icons would cost megabytes up
  front to display the thirty actually on screen.
- **The catalogue is one file per library** (5–83 KB gzipped) holding names and
  search keywords only. The picker fetches it once and filters in memory, which
  is fast enough to search 3,460 icons on every keystroke without debouncing.

Normalisation strips `width`/`height` so an icon scales to its container, keeps
`viewBox` so it still has an aspect ratio, and leaves `currentColor` intact so
inline copies take their color from CSS.

### Adding a library

1. Add the package as a **devDependency** — it is only ever read at build time.
2. Add a `build<Name>()` case in `scripts/build-icons.mjs` returning a catalogue.
3. Add a row to `ICON_LIBRARIES` in `lib/icon-libraries.ts`.
4. Add a `capabilities.fields` entry to `public/.well-known/agility-app.json`.
5. Add `app/fields/icon-<name>/page.tsx` — four lines, pointing at the registry
   row. The field UI and the browser modal are shared.

> **Field names are permanent.** The `name` in the manifest is both the route
> segment and the identifier stored against every content model that uses the
> field. Renaming one orphans existing fields. Labels are free to change.

---

## Notes on the SDK

- The app is built against `@agility/app-sdk` 2.2.1. It runs React 19, which is
  ahead of the SDK's declared React 18 peer — hence `legacy-peer-deps` in
  `.npmrc`. The SDK is a `postMessage` wrapper with no version-sensitive React
  code.
- `.npmrc` also pins the `@fortawesome` scope back to the public registry.
  Agility machines have a global `.npmrc` pointing that scope at the Font Awesome
  **Pro** registry, which 401s for the free package.
- The icon browser passes objects in both directions across `closeModal`, never a
  bare string. The SDK resolves an operation with `data.arg || data.error`, so a
  falsy reply — `undefined` for a cancel, `""` for a clear — would reach the
  field as an error rather than a result.

## Licences

Icons are redistributed from their upstream packages:
Lucide (ISC) · Heroicons (MIT) · Font Awesome Free (CC BY 4.0) · Simple Icons (CC0 1.0).

Simple Icons are brand logos. Using one is not a licence to use the brand it
represents — check the brand's own guidelines.
