"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { closeModal, useAgilityAppSDK } from "@agility/app-sdk"
import {
	ICON_LIBRARIES,
	type CatalogueIcon,
	type IconBrowserProps,
	type IconBrowserResult,
	type IconCatalogue,
	type IconLibraryID,
	formatIconValue,
	iconSrc,
	loadCatalogue,
	parseIconValue,
	searchIcons
} from "@/lib/icon-libraries"
import { IconGlyph, Spinner, StandaloneNotice } from "./ui.client"

/**
 * How many tiles to add at a time as the grid is scrolled.
 *
 * Simple Icons is 3,460 icons; mounting that many <img> elements up front costs
 * about a second of layout for a view that shows thirty of them. Growing the
 * list on scroll keeps the first paint immediate and never needs a virtualised
 * list, because nothing is ever removed once it is on screen.
 */
const BATCH = 240

const resolve = (result: IconBrowserResult) => closeModal(result)

export const IconBrowser = () => {
	const { initializing, modalProps } = useAgilityAppSDK()
	const props = modalProps as IconBrowserProps | undefined

	if (initializing) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner className="h-6 w-6" />
			</div>
		)
	}

	if (!props?.library || !ICON_LIBRARIES[props.library]) {
		return <StandaloneNotice title="Icon browser" />
	}

	return <Browser library={props.library} initialValue={props.value ?? ""} />
}

const Browser = ({ library: libraryID, initialValue }: { library: IconLibraryID; initialValue: string }) => {
	const library = ICON_LIBRARIES[libraryID]
	const current = parseIconValue(library, initialValue)

	const [catalogue, setCatalogue] = useState<IconCatalogue | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [query, setQuery] = useState("")
	const [style, setStyle] = useState<string | null>(
		library.styles.length ? (current?.style ?? library.defaultStyle ?? library.styles[0]) : null
	)
	const [limit, setLimit] = useState(BATCH)
	const searchRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		let live = true
		loadCatalogue(libraryID)
			.then((c) => live && setCatalogue(c))
			.catch((e: Error) => live && setError(e.message))
		return () => {
			live = false
		}
	}, [libraryID])

	useEffect(() => {
		searchRef.current?.focus()
	}, [catalogue])

	const results = useMemo(
		() => (catalogue ? searchIcons(catalogue, query, style) : []),
		[catalogue, query, style]
	)

	// A new result set is a new list; keep the old scroll budget and the user
	// lands halfway down someone else's search.
	useEffect(() => setLimit(BATCH), [query, style])

	const pick = useCallback(
		(icon: CatalogueIcon) => resolve({ value: formatIconValue(library, { name: icon.n, style: icon.s }) }),
		[library]
	)

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") resolve({ cancelled: true })
			// Enter from the search box takes the top match — the fast path when
			// you already know the icon's name.
			if (e.key === "Enter" && document.activeElement === searchRef.current && results.length > 0) {
				e.preventDefault()
				pick(results[0])
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [results, pick])

	const sentinel = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const node = sentinel.current
		if (!node) return
		const observer = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) setLimit((l) => l + BATCH)
		})
		observer.observe(node)
		return () => observer.disconnect()
	}, [results.length])

	const visible = results.slice(0, limit)

	return (
		<div className="flex h-screen flex-col bg-white">
			<div className="shrink-0 border-b border-gray-200 px-5 pt-4 pb-3">
				<div className="relative">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					>
						<circle cx="11" cy="11" r="7" />
						<path strokeLinecap="round" d="m20 20-3.5-3.5" />
					</svg>
					<input
						ref={searchRef}
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={`Search ${catalogue ? catalogue.icons.length.toLocaleString() : ""} ${library.label} icons…`}
						className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
					/>
				</div>

				{library.styles.length > 0 && (
					<div className="mt-3 flex flex-wrap gap-1.5">
						{library.styles.map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setStyle(s)}
								className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
									style === s
										? "bg-brand-600 text-white"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200"
								}`}
							>
								{library.styleLabels[s] ?? s}
							</button>
						))}
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				{error ? (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
				) : !catalogue ? (
					<div className="flex h-40 items-center justify-center">
						<Spinner className="h-6 w-6" />
					</div>
				) : results.length === 0 ? (
					<div className="py-16 text-center">
						<p className="text-sm font-medium text-gray-900">No icons match “{query}”.</p>
						<p className="mt-1 text-sm text-gray-500">Try a shorter word, or a different style.</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
							{visible.map((icon) => {
								const selected = current?.name === icon.n && current?.style === icon.s
								const label = catalogue.labels?.[icon.n] ?? icon.n
								return (
									<button
										key={`${icon.s ?? ""}/${icon.n}`}
										type="button"
										onClick={() => pick(icon)}
										title={`${label}${icon.s ? ` · ${library.styleLabels[icon.s] ?? icon.s}` : ""}`}
										className={`group flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
											selected
												? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
												: "border-transparent hover:border-gray-200 hover:bg-gray-50"
										}`}
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={iconSrc(library, { name: icon.n, style: icon.s })}
											alt=""
											width={24}
											height={24}
											loading="lazy"
											decoding="async"
											className="h-6 w-6"
										/>
										<span className="w-full truncate text-center text-[10px] leading-tight text-gray-500 group-hover:text-gray-700">
											{label}
										</span>
									</button>
								)
							})}
						</div>
						{limit < results.length && <div ref={sentinel} className="h-12" aria-hidden="true" />}
					</>
				)}
			</div>

			<div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
				<div className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
					{current ? (
						<>
							<IconGlyph
								src={iconSrc(library, current)}
								className="h-4 w-4 shrink-0 text-gray-700"
							/>
							<span className="truncate">
								Currently <span className="font-medium text-gray-700">{initialValue}</span>
							</span>
						</>
					) : (
						<span className="truncate">
							{catalogue ? `${results.length.toLocaleString()} shown` : ""}
						</span>
					)}
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{current && (
						<button
							type="button"
							onClick={() => resolve({ cleared: true })}
							className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-800"
						>
							Clear
						</button>
					)}
					<button
						type="button"
						onClick={() => resolve({ cancelled: true })}
						className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	)
}
