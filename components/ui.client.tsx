"use client"

import { useEffect, useRef, useState } from "react"

/**
 * An icon rendered as inline SVG, so it takes its color from CSS.
 *
 * The grid uses plain <img> because it draws hundreds of icons at once and only
 * needs them to be black. This is for the few places where an icon has to sit
 * inside colored UI — the field's own preview, the modal's selection bar —
 * and match it.
 */
export const IconGlyph = ({
	src,
	className = "",
	onResolved
}: {
	src: string
	className?: string
	/** Reports whether the icon actually exists, so callers can flag a bad value. */
	onResolved?: (found: boolean) => void
}) => {
	const [markup, setMarkup] = useState<string | null>(null)
	const resolved = useRef(onResolved)
	resolved.current = onResolved

	useEffect(() => {
		let live = true
		setMarkup(null)

		fetch(src)
			.then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
			.then((text) => {
				if (!live) return
				// Guard against a 404 that an over-helpful host answered with HTML.
				if (!text.trimStart().startsWith("<svg")) throw new Error("not an svg")
				setMarkup(text)
				resolved.current?.(true)
			})
			.catch(() => {
				if (!live) return
				setMarkup(null)
				resolved.current?.(false)
			})

		return () => {
			live = false
		}
	}, [src])

	if (!markup) return <span className={className} aria-hidden="true" />

	return (
		<span
			className={`inline-flex items-center justify-center [&>svg]:h-full [&>svg]:w-full ${className}`}
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: markup }}
		/>
	)
}

export const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
	<span
		className={`inline-block animate-spin rounded-full border-2 border-gray-300 border-t-brand-600 ${className}`}
		role="status"
		aria-label="Loading"
	/>
)

/**
 * What this page says when it is opened directly rather than by Agility.
 *
 * Without an ?appID= the SDK never finishes initializing, so the alternative is
 * a permanently blank page — which looks like a broken deployment when someone
 * is checking whether the app is up.
 */
export const StandaloneNotice = ({ title }: { title: string }) => (
	<div className="m-4 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm">
		<p className="font-semibold text-gray-900">{title}</p>
		<p className="mt-1.5 text-gray-600">
			This page is an Agility CMS custom field. It only works inside the Agility Manager App, which
			loads it in an iframe and passes an <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">appID</code>{" "}
			on the URL.
		</p>
		<a className="mt-3 inline-block font-medium text-brand-700 underline" href="/">
			About this app
		</a>
	</div>
)

/**
 * Renders children once the SDK handshake lands, and explains itself if that
 * never happens because the page was opened outside Agility.
 */
export const FieldGate = ({
	initializing,
	title,
	children
}: {
	initializing: boolean
	title: string
	children: React.ReactNode
}) => {
	const [gaveUp, setGaveUp] = useState(false)

	useEffect(() => {
		if (!initializing) return
		const timer = setTimeout(() => setGaveUp(true), 1500)
		return () => clearTimeout(timer)
	}, [initializing])

	if (!initializing) return <>{children}</>
	if (gaveUp) return <StandaloneNotice title={title} />

	return (
		<div className="flex h-16 items-center justify-center">
			<Spinner />
		</div>
	)
}
