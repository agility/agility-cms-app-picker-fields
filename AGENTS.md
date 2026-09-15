<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Picker Fields

Agility CMS custom-field app: icon pickers for four libraries, plus a hex and a
named color picker. Read `README.md` first — it covers the value formats, the
local host, and the icon build.

## The things that bite

- **`public/icons/` is generated** by `scripts/build-icons.mjs` on predev/prebuild
  and gitignored. Never edit or commit it.
- **Field `name`s in `public/.well-known/agility-app.json` are permanent.** They
  are the route segment *and* the identifier stored against every content model
  using the field. Renaming one orphans live fields.
- **There is no CMS in the loop locally.** Use `/dev-host` (dev only) to drive a
  field; a field opened directly never finishes initializing, by design.
- **The SDK's dispatcher does `data.arg || data.error`.** Anything falsy sent
  back through an operation arrives as an error. Cross the modal boundary with
  objects, never bare strings.
- **Don't add a field listener for the field's own value.** `useAgilityAppSDK`
  already registers one; a second subscription double-fires every edit. Use the
  hook's `fieldValue`.

## Verifying a change

`npm run build` and `npx tsc --noEmit` are the only automated gates — there are
no tests. Anything touching field behaviour should be driven through
`/dev-host` in a browser before it is called done.

## Related repos

- `agility-cms-app-sdk` — the client half of the protocol, and its `docs/`.
- `agility-cms-manager-app-react` — the host half.
  `src/hooks/iframes/useAppSurfaceMessages.ts` is the real contract.
