/**
 * Color maths for the two color fields.
 *
 * Everything is hex in and hex out, because hex is what gets stored. HSV only
 * exists inside the picker: it is the space the saturation square and hue slider
 * are drawn in, and round-tripping through it is what lets dragging feel stable.
 */

export interface RGB {
	r: number
	g: number
	b: number
}

export interface HSV {
	h: number
	s: number
	v: number
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0")

/**
 * Accept what someone might reasonably type and return canonical hex, or null.
 *
 * Handles a missing #, the 3- and 4-digit shorthands, and any casing. Returns
 * 6 digits unless there is real transparency to preserve, so a fully opaque
 * color never gets stored as 8 digits.
 */
export const normaliseHex = (input: string | null | undefined): string | null => {
	let raw = (input ?? "").trim().replace(/^#/, "")
	if (!/^[0-9a-fA-F]+$/.test(raw)) return null

	if (raw.length === 3 || raw.length === 4) {
		raw = raw
			.split("")
			.map((c) => c + c)
			.join("")
	}

	if (raw.length === 6) return `#${raw.toUpperCase()}`
	if (raw.length === 8) {
		const alpha = raw.slice(6, 8).toUpperCase()
		return alpha === "FF" ? `#${raw.slice(0, 6).toUpperCase()}` : `#${raw.toUpperCase()}`
	}
	return null
}

export const hexToRgb = (hex: string): RGB => {
	const raw = (normaliseHex(hex) ?? "#000000").replace(/^#/, "")
	return {
		r: parseInt(raw.slice(0, 2), 16),
		g: parseInt(raw.slice(2, 4), 16),
		b: parseInt(raw.slice(4, 6), 16)
	}
}

export const rgbToHex = ({ r, g, b }: RGB, alpha = 1): string => {
	const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase()
	if (alpha >= 1) return base
	return `${base}${hex2(alpha * 255).toUpperCase()}`
}

export const rgbToHsv = ({ r, g, b }: RGB): HSV => {
	const rn = r / 255
	const gn = g / 255
	const bn = b / 255
	const max = Math.max(rn, gn, bn)
	const min = Math.min(rn, gn, bn)
	const d = max - min

	let h = 0
	if (d !== 0) {
		if (max === rn) h = ((gn - bn) / d) % 6
		else if (max === gn) h = (bn - rn) / d + 2
		else h = (rn - gn) / d + 4
		h *= 60
		if (h < 0) h += 360
	}

	return { h, s: max === 0 ? 0 : d / max, v: max }
}

export const hsvToRgb = ({ h, s, v }: HSV): RGB => {
	const c = v * s
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
	const m = v - c

	const [r1, g1, b1] =
		h < 60
			? [c, x, 0]
			: h < 120
				? [x, c, 0]
				: h < 180
					? [0, c, x]
					: h < 240
						? [0, x, c]
						: h < 300
							? [x, 0, c]
							: [c, 0, x]

	return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 }
}

/**
 * Black or white, whichever is readable on this color.
 *
 * Uses the WCAG relative-luminance curve rather than a naive average so that
 * mid-tone yellows and blues come out right.
 */
export const readableTextOn = (hex: string): string => {
	const { r, g, b } = hexToRgb(hex)
	const channel = (c: number) => {
		const s = c / 255
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
	}
	const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
	return luminance > 0.45 ? "#111827" : "#FFFFFF"
}
