"use client"

import { useEffect, useState } from "react"
import { openModal } from "@agility/app-sdk"
import { useAgilityField } from "@/lib/agility-field"
import {
	type IconBrowserProps,
	type IconBrowserResult,
	type IconLibrary,
	iconSrc,
	parseIconValue
} from "@/lib/icon-libraries"
import { FieldGate, IconGlyph } from "./ui.client"

/**
 * The custom field itself: a compact summary of what is chosen, and a way into
 * the browser.
 *
 * The browsing UI deliberately lives in a host modal rather than in this frame.
 * A custom field is a row in a form — a few dozen pixels tall — and these
 * libraries run to thousands of icons. Expanding inline would either crush the
 * grid or shove the rest of the content form off the screen every time someone
 * went looking for an arrow.
 */
export const IconField = ({ library }: { library: IconLibrary }) => {
	const { initializing, value, setValue, readOnly, containerRef, onFocus, onBlur } = useAgilityField()

	const selection = parseIconValue(library, value)
	const [missing, setMissing] = useState(false)

	// A value can point at an icon the library no longer has — renamed upstream,
	// or typed by hand. Say so rather than showing a silent blank, and never
	// overwrite it: the editor should decide what replaces it.
	useEffect(() => setMissing(false), [value])

	const browse = () => {
		const props: IconBrowserProps = { library: library.id, value }

		openModal<IconBrowserResult>({
			name: "icon-browser",
			title: `Choose an icon — ${library.label}`,
			props,
			callback: (result) => {
				if (!result || result.cancelled) return
				if (result.cleared) return setValue("")
				if (typeof result.value === "string" && result.value) setValue(result.value)
			}
		})
	}

	return (
		<div ref={containerRef} className="p-1">
			<FieldGate initializing={initializing} title={`${library.label} icon picker`}>
				{selection ? (
					<div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
						<div
							className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${
								missing ? "border-dashed border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50"
							}`}
						>
							{missing ? (
								<span className="text-lg leading-none text-amber-500">?</span>
							) : (
								<IconGlyph
									src={iconSrc(library, selection)}
									className="h-6 w-6 text-gray-800"
									onResolved={(found) => setMissing(!found)}
								/>
							)}
						</div>

						<div className="min-w-0 flex-1">
							<div className="truncate font-medium text-gray-900">{selection.name}</div>
							<div className="mt-0.5 flex items-center gap-1.5">
								{selection.style && (
									<span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
										{library.styleLabels[selection.style] ?? selection.style}
									</span>
								)}
								<span className={`truncate text-xs ${missing ? "text-amber-700" : "text-gray-500"}`}>
									{/* The name is already the line above, and for a styled library the
									    badge carries the rest of the value — so name the library here
									    rather than repeating either. */}
									{missing ? "Not in this library — pick a replacement" : library.label}
								</span>
							</div>
						</div>

						{!readOnly && (
							<div className="flex shrink-0 items-center gap-1.5">
								<button
									type="button"
									onClick={browse}
									onFocus={onFocus}
									onBlur={onBlur}
									className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
								>
									Change
								</button>
								<button
									type="button"
									onClick={() => setValue("")}
									onFocus={onFocus}
									onBlur={onBlur}
									aria-label="Clear icon"
									title="Clear icon"
									className="rounded-md border border-transparent px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
								>
									Clear
								</button>
							</div>
						)}
					</div>
				) : (
					<button
						type="button"
						onClick={browse}
						onFocus={onFocus}
						onBlur={onBlur}
						disabled={readOnly}
						className="flex w-full items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-2.5 text-left hover:border-brand-400 hover:bg-brand-50/40 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-300 disabled:hover:bg-white"
					>
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
							</svg>
						</span>
						<span className="min-w-0">
							<span className="block font-medium text-gray-700">
								{readOnly ? "No icon set" : `Choose a ${library.label} icon`}
							</span>
							<span className="mt-0.5 block truncate text-xs text-gray-500">{library.valueHint}</span>
						</span>
					</button>
				)}
			</FieldGate>
		</div>
	)
}
