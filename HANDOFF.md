# Handoff — Picker Fields

Updated 2026-09-15. Supersedes the pre-deploy version of this file.
`README.md` covers how the thing works; this covers where it stands.

Decision taken this session: **private app first, test, then Marketplace.**

---

## Where it stands

| | |
|---|---|
| Branch | `main`, in sync with `origin/main` |
| Commits | 5 — initial, spelling, gitignore, config removal, `91d656e` rename |
| GitHub | `agility/agility-cms-app-picker-fields` — **pushed** (was the #1 risk; it is gone) |
| Vercel | `agility-cms/agility-cms-app-picker-fields`, **git-connected** — pushes auto-deploy |
| Live URL | **https://agility-cms-app-picker-fields.publishwithagility.com** |
| Registered in a CMS? | **No — this is the next step, and it needs you.** |

### Verified live, anonymously (what Agility's iframe will see)

Checked with plain `curl`, no auth, against the production alias:

- `/.well-known/agility-app.json` → 200, correct JSON
- all six `/fields/*` → 200 · `/modals/icon-browser` → 200
- `/dev-host` → **404** in production, as designed
- `/fields/colour-hex` → **404**, confirming the rename fully propagated
- icons for all four libraries → index + SVGs serving
  (lucide 2105, heroicons 1296, fontawesome 2890, simple-icons 3465)

**No Deployment Protection is blocking the iframe.** That was the biggest
deploy-side unknown and it is clear.

The devDependency risk the previous handoff flagged **did not materialise** —
Vercel installs dev deps, so `prebuild` generated all ~9,700 SVGs fine.

`npm run build` and `npx tsc --noEmit` both clean.

### Still not verified — unchanged, and still the whole risk

**No part of this has ever talked to the real Agility Manager App.** Everything
was driven through `/dev-host`, a hand-built stand-in. A field that works there
can still fail in the CMS. Assume at least one thing behaves differently on
first contact.

---

## Settled this session

**Field names are frozen, American spelling** (`20c1488`). These are permanent
once a content model uses them:

`icon-lucide`, `icon-heroicons`, `icon-fontawesome`, `icon-simple-icons`,
**`color-hex`**, **`color-named`** — plus config value **`namedColorSet`**.

Labels, filenames, and internal identifiers all follow, so there is no split
vocabulary. The 148 CSS colour data pairs and the `@img/colour` package name in
the lockfile were deliberately left alone.

**Open question 3 (`sdkVersion`) is answered: 2.0.0 is correct, not stale.**
It means the SDK *protocol major* (v2), not the npm package version, so
`@agility/app-sdk ^2.2.1` is not a conflict. Evidence: the canonical
`agility-cms-apps/example/example-sdk-v2` manifest declares it as
**`__sdkVersion`** — underscore-prefixed, i.e. informational — and no shipped
first-party app (commercetools, external-linked-content, secure-files-aws,
power-fields) includes the key at all. The SDK package never reads it.
*Optional tidy-up:* rename ours to `__sdkVersion` to match the canonical
example. Deliberately not done yet — worth not changing the manifest in the
same change as its first real registration test.

**All app config values were removed** (`77f19dc`). The app installs with
nothing to configure. Three settings went, and with them the features they
gated: brand swatches in the Hex field, the opacity slider, and custom tokens in
the Named field. Two of the three were inherently per-org and had no sensible
default, so they could only be a setting or nothing. Alpha kept its documented
default — off — so the Hex field always stores `#RRGGBB`. An existing
`#RRGGBBAA` value still reads back and previews correctly and truncates to
opaque on the next edit. Net −219 lines.

**The app was renamed to Picker Fields** (`91d656e`). Display name, package
name, GitHub repo, Vercel project and the deployment URL all moved. Field
identifiers were deliberately left alone — those are the permanent ones and the
app name is not among them.

**Vercel SSO protection is on, as `all_except_custom_domains`.** This matters:
a bare `vercel alias set` is *not* exempt and returns a 302 to `vercel.com/sso-api`
with `x-frame-options: DENY`, which would break the Agility iframe silently. The
URL only works anonymously because it was added as a **project domain**
(`vercel domains add`). If the URL ever changes again, add it that way and
re-check it with plain `curl`, not `vercel curl`.

The old `agility-cms-app-pickers.publishwithagility.com` still resolves and is
still attached to the project. Harmless, but it can be removed once the new URL
is registered.

**`agility-cms-app-power-fields` already exists** — Block Editor, Markdown,
Friendly URL. No functional overlap with icons/colours; same "Power *" family.

---

## Next: register it — two stages, not one

The previous handoff had only the second half of this.

**1. Org level** (needs an **Org Administrator**)
Organization Dashboard → Apps → Private Apps → **+ Create Private App**.
Name, **URL** (`https://agility-cms-app-picker-fields.publishwithagility.com`),
Description, optional Icon. Not an Org Admin? The same flow yields an approval
link to send to one.

**2. Instance level** (needs an **Instance Administrator**)
In the Instance: Settings → Apps → **Register** → tick **Private Apps** →
select the app → Install. Nothing to configure.

Then **drive all six fields by hand** on a real content model: pick, clear,
cancel out of the modal, re-open with a value already set, save, reload the
editor, check the stored string. That is the real gate.

---

## Left for the Marketplace conversation

1. **Submission process** — not in public docs. Who curates, what the bar is.
2. **Simple Icons brand rights** — CC0, but they are brand logos. Shipping a
   brand-logo picker to every customer differs from one private org. Legal glance.
3. **`version: "0.1.0"` / `"private": true`** — first-party apps all ship
   `version: "1.0.0"`. Decide before listing.
4. **Plenum UI** — docs push it as the way to look native. This app does not use
   it. May be a de facto listing expectation.

---

## Landmines (cheap to trip)

- `public/icons/` is generated. Never edit or commit it.
- The SDK dispatcher does `data.arg || data.error` — anything falsy sent back
  through an operation arrives as an **error**. Cross the modal boundary with
  objects, never bare strings. Cancel (`undefined`) and clear (`""`) are both falsy.
- Do not add a field listener for the field's own value. `useAgilityAppSDK`
  already registers one; a second subscription double-fires every edit.
- `npm run build` and `npx tsc --noEmit` are the only automated gates. No tests.
- SDK types resolve from `dist/index.d.ts`, not the `types/` source dir — grepping
  the latter will wrongly suggest exports are missing.

## Related repos

- `agility-cms-app-sdk` — client half of the protocol.
- `agility-cms-manager-app-react` — host half.
  `src/hooks/iframes/useAppSurfaceMessages.ts` is the real contract, and what
  `/dev-host` imitates.
