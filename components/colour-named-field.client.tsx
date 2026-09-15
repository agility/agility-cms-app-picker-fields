"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAgilityField } from "@/lib/agility-field"
import { hexToRgb, parseNamedColourSet, readableTextOn, rgbToHsv } from "@/lib/colour"
import { CSS_NAMED_COLOURS } from "@/lib/css-named-colours"
import { FieldGate } from "./ui.client"

/**
 * Order the swatches so browsing works.
 *
 * Alphabetical is the wrong order for choosing a colour — it scatters every
 * blue across the whole list. Sorting by hue, then by how light it is, puts the
 * greys together at the front and walks the spectrum after them, so "something
 * like that green" is findable by eye. Search covers the case where the name is
 * already known.
 */
const byAppearance = (colours: Record<string, string>) =>
	Object.entries(colours)
		.map(([name, hex]) => ({ name, hex, hsv: rgbToHsv(hexToRgb(hex)) }))
		.sort((a, b) => {
			const greyA = a.hsv.s < 0.08
			const greyB = b.hsv.s < 0.08
			if (greyA !== greyB) return greyA ? -1 : 1
			if (greyA) return b.hsv.v - a.hsv.v
			if (Math.round(a.hsv.h / 12) !== Math.round(b.hsv.h / 12)) return a.hsv.h - b.hsv.h
			return b.hsv.v - a.hsv.v
		})

export const ColourNamedField = () => {
	const { initializing, value, setValue, readOnly, config, containerRef, onFocus, onBlur } = useAgilityField()

	const custom = useMemo(() => parseNamedColourSet(config.namedColourSet), [config.namedColourSet])
	const colours = custom ?? CSS_NAMED_COLOURS
	const ordered = useMemo(() => byAppearance(colours), [colours])

	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const searchRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (open) searchRef.current?.focus()
		else setQuery("")
	}, [open])

	const results = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return ordered
		return ordered.filter((c) => c.name.toLowerCase().includes(q))
	}, [ordered, query])

	// The stored name may not be in the active set — a CSS name left behind after
	// the install switched to custom tokens. Show it as unknown rather than
	// blank, and leave the value alone.
	const selectedHex = value ? colours[value] : undefined
	const unknown = Boolean(value) && !selectedHex

	const choose = (name: string) => {
		setValue(name)
		setOpen(false)
	}

	return (
		<div ref={containerRef} className="p-1">
			<FieldGate initializing={initializing} title="Named colour picker">
				<div className="rounded-lg border border-gray-200 bg-white">
					<div className="flex items-center gap-2.5 p-2.5">
						<span
							className={`h-9 w-9 shrink-0 rounded-md border ${
								unknown ? "border-dashed border-amber-300 bg-amber-50" : "border-gray-300"
							}`}
							style={selectedHex ? { background: selectedHex } : undefined}
						/>

						<div className="min-w-0 flex-1">
							{value ? (
								<>
									<div className="truncate font-medium text-gray-900">{value}</div>
									<div className={`truncate text-xs ${unknown ? "text-amber-700" : "text-gray-500"}`}>
										{unknown ? "Not in the current colour set" : selectedHex}
									</div>
								</>
							) : (
								<span className="text-gray-500">
									{readOnly ? "No colour set" : `Choose from ${ordered.length} named colours`}
								</span>
							)}
						</div>

						{!readOnly && (
							<div className="flex shrink-0 items-center gap-1.5">
								{value && (
									<button
										type="button"
										onClick={() => setValue("")}
										onFocus={onFocus}
										onBlur={onBlur}
										className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
									>
										Clear
									</button>
								)}
								<button
									type="button"
									onClick={() => setOpen((o) => !o)}
									onFocus={onFocus}
									onBlur={onBlur}
									aria-expanded={open}
									className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
								>
									{open ? "Done" : value ? "Change" : "Pick"}
								</button>
							</div>
						)}
					</div>

					{open && !readOnly && (
						<div className="border-t border-gray-200 p-3">
							<input
								ref={searchRef}
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Escape") setOpen(false)
									if (e.key === "Enter" && results.length > 0) choose(results[0].name)
								}}
								placeholder="Search colour names…"
								className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
							/>

							{results.length === 0 ? (
								<p className="py-8 text-center text-sm text-gray-500">No colour names match “{query}”.</p>
							) : (
								<div className="mt-3 grid max-h-64 grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-1.5 overflow-y-auto">
									{results.map((c) => (
										<button
											key={c.name}
											type="button"
											onClick={() => choose(c.name)}
											title={`${c.name} · ${c.hex}`}
											className={`flex flex-col gap-1 rounded-md border p-1 text-left transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
												value === c.name
													? "border-gray-900 ring-1 ring-gray-900"
													: "border-transparent hover:border-gray-200 hover:bg-gray-50"
											}`}
										>
											<span
												className="flex h-8 w-full items-center justify-center rounded"
												style={{ background: c.hex }}
											>
												{value === c.name && (
													<svg
														viewBox="0 0 24 24"
														fill="none"
														stroke={readableTextOn(c.hex)}
														strokeWidth="3"
														className="h-4 w-4"
													>
														<path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
													</svg>
												)}
											</span>
											<span className="w-full truncate text-[10px] leading-tight text-gray-600">{c.name}</span>
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</FieldGate>
		</div>
	)
}
