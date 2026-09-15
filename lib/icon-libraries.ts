/**
 * What the four icon fields have in common.
 *
 * Every icon field is the same component pointed at a different entry here, so
 * adding a fifth library is a build-script case plus one more row in this file.
 */

export type IconLibraryID = "lucide" | "heroicons" | "fontawesome" | "simple-icons"

export interface IconLibrary {
	id: IconLibraryID
	/** The field's route segment, and the capability name in the manifest. */
	field: string
	label: string
	/** Empty when every icon in the library looks the same way. */
	styles: string[]
	styleLabels: Record<string, string>
	defaultStyle?: string
	/** Shown under the field so an editor knows what lands in the value. */
	valueHint: string
	licence: string
	/**
	 * Simple Icons is a set of brand marks, each with an official color. The
	 * picker offers that color for copying; it never renders the grid in it,
	 * because a wall of brand colors is unreadable.
	 */
	hasBrandColors?: boolean
}

export const ICON_LIBRARIES: Record<IconLibraryID, IconLibrary> = {
	lucide: {
		id: "lucide",
		field: "icon-lucide",
		label: "Lucide",
		styles: [],
		styleLabels: {},
		valueHint: "Stores the icon name, e.g. arrow-right",
		licence: "ISC"
	},
	heroicons: {
		id: "heroicons",
		field: "icon-heroicons",
		label: "Heroicons",
		styles: ["outline", "solid", "mini", "micro"],
		styleLabels: {
			outline: "Outline 24",
			solid: "Solid 24",
			mini: "Mini 20",
			micro: "Micro 16"
		},
		defaultStyle: "outline",
		valueHint: "Stores style/name, e.g. outline/academic-cap",
		licence: "MIT"
	},
	fontawesome: {
		id: "fontawesome",
		field: "icon-fontawesome",
		label: "Font Awesome Free",
		styles: ["solid", "regular", "brands"],
		styleLabels: { solid: "Solid", regular: "Regular", brands: "Brands" },
		defaultStyle: "solid",
		valueHint: "Stores style/name, e.g. solid/star",
		licence: "CC BY 4.0"
	},
	"simple-icons": {
		id: "simple-icons",
		field: "icon-simple-icons",
		label: "Simple Icons",
		styles: [],
		styleLabels: {},
		valueHint: "Stores the brand slug, e.g. github",
		licence: "CC0 1.0",
		hasBrandColors: true
	}
}

/** One icon in a catalogue. Keys are short because these files list thousands. */
export interface CatalogueIcon {
	n: string
	s?: string
}

export interface IconCatalogue {
	library: IconLibraryID
	label: string
	styles: string[]
	defaultStyle?: string
	icons: CatalogueIcon[]
	/** name → extra words to match on. Keyed by name, not by name+style. */
	terms: Record<string, string>
	/** Display titles, where the slug is not the brand's own spelling. */
	labels?: Record<string, string>
	/** Brand colors, hex without the leading #. */
	hex?: Record<string, string>
}

/** A parsed field value. */
export interface IconSelection {
	name: string
	style?: string
}

/**
 * Read a stored value.
 *
 * Returns null for anything unparseable rather than throwing, because the value
 * is whatever is in the CMS — including something typed by hand, or left behind
 * by a different field type.
 */
export const parseIconValue = (library: IconLibrary, value: string | undefined | null): IconSelection | null => {
	const raw = (value ?? "").trim()
	if (!raw) return null

	if (library.styles.length === 0) return { name: raw }

	const slash = raw.indexOf("/")
	if (slash === -1) {
		// A bare name against a styled library: assume the default style, so a
		// value hand-typed as "star" still resolves rather than showing broken.
		return { name: raw, style: library.defaultStyle }
	}

	const style = raw.slice(0, slash)
	const name = raw.slice(slash + 1)
	if (!name) return null
	return { name, style: library.styles.includes(style) ? style : library.defaultStyle }
}

/** Build the value to store. The inverse of parseIconValue. */
export const formatIconValue = (library: IconLibrary, selection: IconSelection): string =>
	library.styles.length === 0 || !selection.style
		? selection.name
		: `${selection.style}/${selection.name}`

/** Where the build script put this icon's SVG. */
export const iconSrc = (library: IconLibrary, selection: IconSelection): string =>
	library.styles.length === 0 || !selection.style
		? `/icons/${library.id}/svg/${encodeURIComponent(selection.name)}.svg`
		: `/icons/${library.id}/svg/${encodeURIComponent(selection.style)}/${encodeURIComponent(selection.name)}.svg`

/**
 * Fetch a library's catalogue, once per page load.
 *
 * These files run from 5KB to 83KB gzipped, so the picker pays for one and then
 * searches in memory — fast enough to filter on every keystroke across 3,460
 * icons without debouncing.
 */
const catalogues = new Map<IconLibraryID, Promise<IconCatalogue>>()

export const loadCatalogue = (id: IconLibraryID): Promise<IconCatalogue> => {
	const existing = catalogues.get(id)
	if (existing) return existing

	const request = fetch(`/icons/${id}/index.json`)
		.then((res) => {
			if (!res.ok) throw new Error(`Could not load the ${id} icon catalogue (${res.status}).`)
			return res.json() as Promise<IconCatalogue>
		})
		.catch((err) => {
			// Don't cache a failure — a reopened picker should retry.
			catalogues.delete(id)
			throw err
		})

	catalogues.set(id, request)
	return request
}

/**
 * Rank icons against a query.
 *
 * Icon names are hyphenated and people type spaces, so the query is split into
 * tokens and every one of them has to land somewhere. Without that, searching
 * "arrow right" misses `arrow-right` entirely — the single most obvious thing
 * anyone will type into this box.
 *
 * Ordering then matters more than it looks: "arrow" alone matches over a
 * hundred Lucide icons, and the plain `arrow-right` has to beat
 * `square-arrow-out-up-right`. Exact name first, then prefix, then all tokens
 * somewhere in the name, then a brand title, and a keyword-only match last.
 */
export const searchIcons = (catalogue: IconCatalogue, query: string, style: string | null): CatalogueIcon[] => {
	const styled = style ? catalogue.icons.filter((i) => i.s === style) : catalogue.icons

	const tokens = query.trim().toLowerCase().split(/[\s\-_]+/).filter(Boolean)
	if (tokens.length === 0) return styled

	// What the query would look like as an icon name.
	const joined = tokens.join("-")

	const scored: { icon: CatalogueIcon; score: number }[] = []

	for (const icon of styled) {
		const name = icon.n
		let score = -1

		if (name === joined) score = 0
		else if (name.startsWith(joined)) score = 1
		else if (tokens.every((t) => name.includes(t))) score = 2
		else {
			const label = catalogue.labels?.[name]?.toLowerCase() ?? ""
			const terms = catalogue.terms[name] ?? ""
			if (label && tokens.every((t) => label.includes(t))) score = 3
			else if (tokens.every((t) => name.includes(t) || label.includes(t) || terms.includes(t))) score = 4
		}

		if (score >= 0) scored.push({ icon, score })
	}

	// A stable sort keeps the catalogue's own alphabetical order inside each tier.
	return scored.sort((a, b) => a.score - b.score).map((s) => s.icon)
}

/**
 * The contract between an icon field and the browser modal it opens.
 *
 * Both directions are objects on purpose. The SDK's dispatcher resolves an
 * operation with `data.arg || data.error`, so a falsy reply — `undefined` for a
 * cancel, `""` for a clear — would arrive at the field as an error instead of a
 * result. An object is always truthy, so the intent survives the trip.
 */
export interface IconBrowserProps {
	library: IconLibraryID
	/** The value as stored today, so the modal can open on the current icon. */
	value: string
}

export interface IconBrowserResult {
	value?: string
	cleared?: boolean
	cancelled?: boolean
}
