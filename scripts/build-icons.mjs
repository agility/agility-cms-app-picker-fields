/**
 * Turns the four icon packages in node_modules into static assets under
 * public/icons/, so the running app never touches node_modules or a CDN.
 *
 * Per library it writes:
 *   public/icons/<lib>/index.json          the searchable catalogue (names + terms)
 *   public/icons/<lib>/svg/[<style>/]<name>.svg   one normalised file per icon
 *
 * The catalogue is what the picker fetches on open; the SVGs are lazy-loaded by
 * the grid one <img> at a time, which is why they stay separate files rather
 * than one big blob — a 3,460-icon library would otherwise cost megabytes up
 * front to show the twelve icons actually on screen.
 *
 * Run by `predev` and `prebuild`. Output is gitignored — this is a build step,
 * not a checked-in artifact.
 */
import { createRequire } from "node:module"
import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(ROOT, "public", "icons")

/**
 * Resolve a package's directory without importing it.
 *
 * Most packages expose ./package.json, but some (simple-icons) restrict their
 * `exports` map and refuse it, so fall back to the main entry point.
 */
const pkgDir = (name) => {
	try {
		return dirname(require.resolve(`${name}/package.json`))
	} catch {
		let dir = dirname(require.resolve(name))
		while (dir !== dirname(dir)) {
			if (existsSync(join(dir, "package.json"))) return dir
			dir = dirname(dir)
		}
		throw new Error(`Could not locate the package directory for ${name}`)
	}
}

/**
 * Strip an SVG down to something that scales to its container and takes its
 * colour from CSS.
 *
 * `width`/`height` have to go or the icon ignores the grid cell it sits in;
 * `viewBox` stays, because it is what gives the file an aspect ratio once the
 * explicit dimensions are gone.
 */
const normalise = (svg, { forceCurrentColor = false } = {}) => {
	let out = svg
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<\?xml[\s\S]*?\?>/g, "")
		.trim()

	out = out.replace(/<svg\b[^>]*>/, (tag) => {
		let t = tag
			.replace(/\s(?:width|height)="[^"]*"/g, "")
			.replace(/\sclass="[^"]*"/g, "")
			.replace(/\s(?:aria-hidden|data-slot)="[^"]*"/g, "")
		// Simple Icons ship bare paths that default to black. Everything else
		// already declares currentColor on fill or stroke.
		if (forceCurrentColor && !/\sfill="/.test(t)) {
			t = t.replace(/^<svg/, '<svg fill="currentColor"')
		}
		return t
	})

	return out
		.replace(/\s+/g, " ")
		.replace(/\s+>/g, ">")
		.replace(/\s+\/>/g, "/>")
		.replace(/>\s+</g, "><")
		.trim()
}

/** Search terms cost bytes in the catalogue; keep the useful ones only. */
const packTerms = (name, terms) => {
	const own = new Set(name.split("-"))
	const kept = []
	for (const raw of terms) {
		const t = String(raw).toLowerCase().trim()
		if (!t || own.has(t) || name.includes(t)) continue
		if (!kept.includes(t)) kept.push(t)
		if (kept.length === 8) break
	}
	return kept.join(" ")
}

const writeIcon = async (lib, style, name, svg) => {
	const dir = style ? join(OUT, lib, "svg", style) : join(OUT, lib, "svg")
	await mkdir(dir, { recursive: true })
	await writeFile(join(dir, `${name}.svg`), svg, "utf8")
}

const svgNames = async (dir) =>
	(await readdir(dir)).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4))

// ---------------------------------------------------------------- libraries

async function buildLucide() {
	const base = pkgDir("lucide-static")
	const dir = join(base, "icons")
	const names = await svgNames(dir)
	const tags = JSON.parse(await readFile(join(base, "tags.json"), "utf8"))

	const icons = []
	const terms = {}
	for (const name of names) {
		const svg = normalise(await readFile(join(dir, `${name}.svg`), "utf8"))
		await writeIcon("lucide", null, name, svg)
		icons.push({ n: name })
		const t = packTerms(name, tags[name] || [])
		if (t) terms[name] = t
	}
	return { library: "lucide", label: "Lucide", styles: [], icons, terms }
}

async function buildHeroicons() {
	const base = pkgDir("heroicons")
	// Heroicons ship by pixel size; the names below are what Heroicons itself
	// calls them in its docs, and what the stored value uses.
	const styles = [
		{ style: "outline", dir: join(base, "24", "outline") },
		{ style: "solid", dir: join(base, "24", "solid") },
		{ style: "mini", dir: join(base, "20", "solid") },
		{ style: "micro", dir: join(base, "16", "solid") }
	]

	const icons = []
	for (const { style, dir } of styles) {
		for (const name of await svgNames(dir)) {
			const svg = normalise(await readFile(join(dir, `${name}.svg`), "utf8"))
			await writeIcon("heroicons", style, name, svg)
			icons.push({ n: name, s: style })
		}
	}
	return {
		library: "heroicons",
		label: "Heroicons",
		styles: styles.map((s) => s.style),
		defaultStyle: "outline",
		icons,
		terms: {}
	}
}

async function buildFontAwesome() {
	const base = pkgDir("@fortawesome/fontawesome-free")
	const meta = JSON.parse(await readFile(join(base, "metadata", "icon-families.json"), "utf8"))
	const styles = ["solid", "regular", "brands"]

	const icons = []
	const terms = {}
	for (const style of styles) {
		const dir = join(base, "svgs", style)
		for (const name of await svgNames(dir)) {
			const svg = normalise(await readFile(join(dir, `${name}.svg`), "utf8"))
			await writeIcon("fontawesome", style, name, svg)
			icons.push({ n: name, s: style })
			if (!terms[name]) {
				const t = packTerms(name, meta[name]?.search?.terms || [])
				if (t) terms[name] = t
			}
		}
	}
	return {
		library: "fontawesome",
		label: "Font Awesome Free",
		styles,
		defaultStyle: "solid",
		icons,
		terms
	}
}

async function buildSimpleIcons() {
	const base = pkgDir("simple-icons")
	const data = JSON.parse(await readFile(join(base, "data", "simple-icons.json"), "utf8"))
	const dir = join(base, "icons")
	const available = new Set(await svgNames(dir))

	const icons = []
	const terms = {}
	const labels = {}
	const hex = {}
	for (const entry of data) {
		const name = entry.slug
		if (!name || !available.has(name)) continue
		const svg = normalise(await readFile(join(dir, `${name}.svg`), "utf8"), {
			forceCurrentColor: true
		})
		await writeIcon("simple-icons", null, name, svg)
		icons.push({ n: name })
		labels[name] = entry.title
		if (entry.hex) hex[name] = entry.hex
		const aliases = [entry.title, ...(entry.aliases?.aka || []), ...(entry.aliases?.dup?.map((d) => d.title) || [])]
		const t = packTerms(name, aliases)
		if (t) terms[name] = t
	}
	return {
		library: "simple-icons",
		label: "Simple Icons",
		styles: [],
		icons,
		terms,
		labels,
		hex
	}
}

// ---------------------------------------------------------------------- run

const builders = [buildLucide, buildHeroicons, buildFontAwesome, buildSimpleIcons]

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const summary = []
for (const build of builders) {
	const started = Date.now()
	const catalogue = await build()
	await writeFile(
		join(OUT, catalogue.library, "index.json"),
		JSON.stringify(catalogue),
		"utf8"
	)
	summary.push(
		`  ${catalogue.label.padEnd(20)} ${String(catalogue.icons.length).padStart(5)} icons  ${Date.now() - started}ms`
	)
}

console.log("Power Pickers — icon assets built:")
console.log(summary.join("\n"))
