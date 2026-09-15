"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { configFlag, useAgilityField } from "@/lib/agility-field"
import {
	type HSV,
	hexAlpha,
	hexToRgb,
	hsvToRgb,
	normaliseHex,
	parseSwatches,
	readableTextOn,
	rgbToHex,
	rgbToHsv
} from "@/lib/color"
import { FieldGate } from "./ui.client"

/** Chromium-only; feature-detected before it is offered. */
interface EyeDropperAPI {
	open: () => Promise<{ sRGBHex: string }>
}
declare global {
	interface Window {
		EyeDropper?: new () => EyeDropperAPI
	}
}

/**
 * A draggable 2D or 1D control.
 *
 * Pointer capture is what makes dragging feel right: without it, the pointer
 * leaving the element mid-drag drops the interaction, so the color stops
 * following the cursor the moment you overshoot the edge of the square.
 */
const useDrag = (onMove: (x: number, y: number, rect: DOMRect) => void) => {
	const ref = useRef<HTMLDivElement>(null)

	const handle = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const node = ref.current
			if (!node) return
			const rect = node.getBoundingClientRect()
			onMove(
				Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
				Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
				rect
			)
		},
		[onMove]
	)

	return {
		ref,
		onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
			e.currentTarget.setPointerCapture(e.pointerId)
			handle(e)
		},
		onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) handle(e)
		},
		onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
	}
}

export const ColorHexField = () => {
	const { initializing, value, setValue, readOnly, config, containerRef, onFocus, onBlur } = useAgilityField()

	const allowAlpha = configFlag(config, "hexAllowAlpha")
	const swatches = useMemo(() => parseSwatches(config.brandSwatches), [config.brandSwatches])

	const [open, setOpen] = useState(false)
	const stored = normaliseHex(value)

	// Feature-detected in an effect, not in render: the server has no window, so
	// testing for it inline would render a different tree on each side and trip
	// hydration.
	const [hasEyeDropper, setHasEyeDropper] = useState(false)
	useEffect(() => setHasEyeDropper(typeof window !== "undefined" && !!window.EyeDropper), [])

	/**
	 * HSV is held locally rather than derived from the stored hex on every
	 * render, because the conversion is lossy at the edges: black has no hue and
	 * no saturation, so dragging into the bottom of the square and back out
	 * would otherwise snap the hue to red.
	 */
	const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb(stored ?? "#4F46E5")))
	const [alpha, setAlpha] = useState(() => (stored ? hexAlpha(stored) : 1))
	const [draft, setDraft] = useState(value)

	const localHex = rgbToHex(hsvToRgb(hsv), allowAlpha ? alpha : 1)

	// Re-sync when the value changes underneath us — another editor, an undo, or
	// the text box being typed into. Comparing against what this picker would
	// produce keeps our own writes from bouncing back and resetting the hue.
	useEffect(() => {
		if (!stored || stored === localHex) return
		setHsv(rgbToHsv(hexToRgb(stored)))
		setAlpha(hexAlpha(stored))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stored])

	useEffect(() => setDraft(value), [value])

	const commit = (next: HSV, nextAlpha = alpha) => {
		setHsv(next)
		setAlpha(nextAlpha)
		setValue(rgbToHex(hsvToRgb(next), allowAlpha ? nextAlpha : 1))
	}

	const square = useDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }))
	const hue = useDrag((x) => commit({ ...hsv, h: x * 360 }))
	const alphaBar = useDrag((x) => commit(hsv, x))

	const commitText = (text: string) => {
		const hex = normaliseHex(text)
		if (!hex) return setDraft(value)
		setHsv(rgbToHsv(hexToRgb(hex)))
		setAlpha(hexAlpha(hex))
		setValue(allowAlpha ? hex : (normaliseHex(hex.slice(0, 7)) ?? hex))
	}

	const pickFromScreen = async () => {
		if (!window.EyeDropper) return
		try {
			const { sRGBHex } = await new window.EyeDropper().open()
			commitText(sRGBHex)
		} catch {
			// The user dismissed the eyedropper. Nothing to do.
		}
	}

	const preview = stored ?? "#FFFFFF"

	return (
		<div ref={containerRef} className="p-1">
			<FieldGate initializing={initializing} title="Hex color picker">
				<div className="rounded-lg border border-gray-200 bg-white">
					<div className="flex items-center gap-2.5 p-2.5">
						<button
							type="button"
							onClick={() => !readOnly && setOpen((o) => !o)}
							disabled={readOnly}
							aria-expanded={open}
							aria-label={open ? "Close the color picker" : "Open the color picker"}
							className="alpha-grid h-9 w-9 shrink-0 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed"
						>
							<span className="block h-full w-full rounded-[3px]" style={{ background: stored ?? "transparent" }} />
						</button>

						<input
							type="text"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onBlur={(e) => {
								commitText(e.target.value)
								onBlur()
							}}
							onFocus={onFocus}
							onKeyDown={(e) => e.key === "Enter" && commitText(e.currentTarget.value)}
							readOnly={readOnly}
							spellCheck={false}
							placeholder="#000000"
							aria-label="Hex color value"
							className="w-32 rounded-md border border-gray-300 px-2.5 py-1.5 font-mono text-sm uppercase focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none read-only:bg-gray-50"
						/>

						<div className="flex-1" />

						{!readOnly && (
							<>
								{hasEyeDropper && (
									<button
										type="button"
										onClick={pickFromScreen}
										title="Pick a color from the screen"
										aria-label="Pick a color from the screen"
										className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
											<path strokeLinecap="round" strokeLinejoin="round" d="m16 4 4 4M18 6 8.5 15.5 5 19l-1 1 1 1 1-1 3.5-3.5L19 7" />
										</svg>
									</button>
								)}
								{stored && (
									<button
										type="button"
										onClick={() => setValue("")}
										className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
									>
										Clear
									</button>
								)}
								<button
									type="button"
									onClick={() => setOpen((o) => !o)}
									className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
								>
									{open ? "Done" : "Pick"}
								</button>
							</>
						)}
					</div>

					{open && !readOnly && (
						<div className="border-t border-gray-200 p-3">
							<div
								{...square}
								className="relative h-36 w-full cursor-crosshair rounded-md"
								style={{
									background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h} 100% 50%)`
								}}
							>
								<span
									className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
									style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: localHex.slice(0, 7) }}
								/>
							</div>

							<div
								{...hue}
								className="relative mt-3 h-3.5 w-full cursor-pointer rounded-full"
								style={{
									background:
										"linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
								}}
							>
								<span
									className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
									style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
								/>
							</div>

							{allowAlpha && (
								<div {...alphaBar} className="alpha-grid relative mt-3 h-3.5 w-full cursor-pointer rounded-full">
									<span
										className="absolute inset-0 rounded-full"
										style={{
											background: `linear-gradient(to right, transparent, ${localHex.slice(0, 7)})`
										}}
									/>
									<span
										className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
										style={{ left: `${alpha * 100}%` }}
									/>
								</div>
							)}

							{swatches.length > 0 && (
								<div className="mt-3.5 border-t border-gray-100 pt-3">
									<div className="mb-1.5 text-[11px] font-medium tracking-wide text-gray-500 uppercase">
										Brand
									</div>
									<div className="flex flex-wrap gap-1.5">
										{swatches.map((s) => (
											<button
												key={s.hex}
												type="button"
												onClick={() => commitText(s.hex)}
												title={s.label ? `${s.label} · ${s.hex}` : s.hex}
												className={`h-7 w-7 rounded-md border transition-transform hover:scale-110 focus:ring-2 focus:ring-brand-500 focus:outline-none ${
													stored === s.hex ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300"
												}`}
												style={{ background: s.hex }}
											>
												{stored === s.hex && (
													<svg
														viewBox="0 0 24 24"
														fill="none"
														stroke={readableTextOn(s.hex)}
														strokeWidth="3"
														className="mx-auto h-3.5 w-3.5"
													>
														<path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
													</svg>
												)}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</FieldGate>
		</div>
	)
}
