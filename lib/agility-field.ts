"use client"

import { useCallback } from "react"
import { contentItemMethods, setFocus, useAgilityAppSDK, useResizeHeight } from "@agility/app-sdk"

/**
 * The bits of the SDK every field in this app needs, in one place.
 *
 * Three things are easy to get wrong on the custom-field surface and are all
 * handled here:
 *
 *  - **Height.** The host cannot see inside a cross-origin iframe, so a field
 *    that grows stays clipped until it reports a new height. `containerRef`
 *    wires a ResizeObserver to do that.
 *  - **Focus.** The editor's presence UI (who is editing what) only lights up
 *    if the field says when it is focused.
 *  - **Reading the value.** `fieldValue` from the hook is already kept live by a
 *    listener the hook registers itself. Adding another listener for our own
 *    field would double-fire every edit — see the SDK's note on
 *    `addFieldListener`.
 */
export interface AgilityFieldBridge {
	initializing: boolean
	/** Null until the handshake completes, and outside an Agility iframe. */
	fieldName: string | undefined
	readOnly: boolean
	value: string
	setValue: (value: string) => void
	/** Attach to the outermost element so the iframe tracks its height. */
	containerRef: (node: HTMLElement | null) => void
	onFocus: () => void
	onBlur: () => void
}

/**
 * 16px of slack under the measured height.
 *
 * The SDK captures this on first render and never re-reads it, so it has to be
 * a constant rather than a prop.
 */
const HEIGHT_PADDING = 16

export const useAgilityField = (): AgilityFieldBridge => {
	const { initializing, field, fieldValue } = useAgilityAppSDK()
	const containerRef = useResizeHeight(HEIGHT_PADDING)

	const setValue = useCallback(
		(value: string) => {
			// `name` is omitted deliberately: on a custom field the host writes to
			// the field the iframe belongs to, and passing a stale name from a
			// closure is how a field ends up writing to the wrong one.
			contentItemMethods.setFieldValue({ value })
		},
		[]
	)

	const onFocus = useCallback(() => setFocus({ isFocused: true }), [])
	const onBlur = useCallback(() => setFocus({ isFocused: false }), [])

	return {
		initializing,
		fieldName: field?.name,
		readOnly: field?.readOnly === true,
		value: typeof fieldValue === "string" ? fieldValue : "",
		setValue,
		containerRef,
		onFocus,
		onBlur
	}
}
