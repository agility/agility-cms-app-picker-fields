"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import manifest from "@/public/.well-known/agility-app.json"

/**
 * A stand-in for the Agility Manager App, for local development.
 *
 * The fields in this app are useless on their own: they are iframes that talk
 * postMessage to a host, and without one the SDK never finishes initializing.
 * Getting a real one means a CMS instance, a deployed URL and an app install —
 * far too slow a loop to build a color picker against.
 *
 * So this page implements the host half of the protocol: the initialize/context
 * handshake, setFieldValue and its echo back through the field listener,
 * setHeight, setFocus, and the openModal/closeModal round trip. It is
 * deliberately the same wire format as `useAppSurfaceMessages.ts` in
 * agility-cms-manager-app-react — that file is the real contract, and this is a
 * copy of the parts these fields use.
 *
 * It is NOT a test of Agility itself. A field that works here can still fail in
 * the CMS if the real host differs; it just fails far less often.
 */

const APP_ID = "dev-app"

interface AppMessage {
	appID?: string
	operationID?: string
	operationType?: string
	arg?: any
}

export const DevHost = () => {
	const fields = manifest.capabilities.fields

	const [fieldName, setFieldName] = useState(fields[0].name)
	const [value, setValue] = useState("")
	const [height, setHeight] = useState(60)
	const [focused, setFocused] = useState(false)
	const [log, setLog] = useState<string[]>([])

	const [modal, setModal] = useState<{ name: string; title: string; props: any; closeModalID: string } | null>(null)

	const fieldFrame = useRef<HTMLIFrameElement>(null)
	const modalFrame = useRef<HTMLIFrameElement>(null)

	// Read through a ref inside the message handler: the handler is bound once,
	// and a stale `value` would make every setFieldValue look like a change.
	const valueRef = useRef(value)
	valueRef.current = value

	const note = useCallback((line: string) => {
		setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 40))
	}, [])

	const post = useCallback((frame: HTMLIFrameElement | null, message: AppMessage) => {
		frame?.contentWindow?.postMessage(message, "*")
	}, [])

	const fieldNameRef = useRef(fieldName)
	fieldNameRef.current = fieldName

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			const data = event.data as AppMessage
			if (!data?.operationType || data.appID !== APP_ID) return

			const fromModal = event.source === modalFrame.current?.contentWindow
			const target = fromModal ? modalFrame.current : fieldFrame.current
			const surface = fromModal ? "modal" : "field"

			switch (data.operationType) {
				case "initialize": {
					// Mirrors IFrameProvider.initialize: app + instance + locale,
					// spread with whatever the surface adds.
					const extra = fromModal
						? { modalProps: modal?.props }
						: {
								field: {
									id: "dev-field",
									name: fieldNameRef.current,
									label: fieldNameRef.current,
									typeName: "Custom",
									value: valueRef.current,
									required: false,
									readOnly: false
								},
								contentItem: {
									contentID: -1,
									referenceName: "DevContent",
									// The SDK seeds fieldValue from here, not from field.value.
									values: { [fieldNameRef.current]: valueRef.current }
								},
								contentModel: { id: 1, referenceName: "DevContent" }
							}

					post(target, {
						appID: APP_ID,
						operationID: data.operationID,
						operationType: "context",
						arg: {
							app: { appID: APP_ID, configuration: {} },
							instance: { guid: "dev-guid", websiteName: "Dev Instance" },
							locale: "en-us",
							...extra
						}
					})
					note(`${surface} → initialize`)
					break
				}

				case "setFieldValue": {
					const next = String(data.arg?.value ?? "")
					if (next === valueRef.current) return
					valueRef.current = next
					setValue(next)
					// The real host echoes the change back to every field listener,
					// which is how the SDK's own `fieldValue` stays current.
					post(fieldFrame.current, {
						appID: APP_ID,
						operationID: `${fieldNameRef.current}-${APP_ID}`,
						operationType: "onFieldChanged",
						arg: { fieldValue: next }
					})
					note(`field → setFieldValue ${JSON.stringify(next)}`)
					break
				}

				case "addFieldListener":
					note(`${surface} → addFieldListener ${data.arg?.fieldName}`)
					break

				case "setHeight":
					setHeight(Number(data.arg?.height) || 60)
					break

				case "setFocus":
					setFocused(Boolean(data.arg?.isFocused))
					break

				case "openModal":
					setModal({
						name: data.arg?.name,
						title: data.arg?.title ?? "",
						props: data.arg?.props,
						closeModalID: data.arg?.closeModalID
					})
					note(`field → openModal ${data.arg?.name}`)
					break

				case "closeModal": {
					setModal(null)
					// The host relays the whole arg; the SDK reads .props off it.
					post(fieldFrame.current, {
						appID: APP_ID,
						operationID: data.arg?.closeModalID,
						operationType: "openModal",
						arg: data.arg
					})
					note(`modal → closeModal ${JSON.stringify(data.arg?.props)}`)
					break
				}

				default:
					note(`${surface} → ${data.operationType}`)
			}
		}

		window.addEventListener("message", onMessage)
		return () => window.removeEventListener("message", onMessage)
	}, [modal, note, post])

	const field = fields.find((f) => f.name === fieldName)

	return (
		<main className="mx-auto max-w-5xl px-6 py-8">
			<header className="mb-6">
				<h1 className="text-xl font-semibold text-gray-900">Power Pickers — local host</h1>
				<p className="mt-1 text-sm text-gray-600">
					A stand-in for the Agility Manager App, so the fields can be driven without a CMS. Not part of the
					shipped app.
				</p>
			</header>

			<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
				<section>
					<div className="mb-3 flex flex-wrap gap-1.5">
						{fields.map((f) => (
							<button
								key={f.name}
								type="button"
								onClick={() => {
									setFieldName(f.name)
									setValue("")
									setHeight(60)
								}}
								className={`rounded-full px-3 py-1 text-xs font-medium ${
									fieldName === f.name ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								{f.label}
							</button>
						))}
					</div>

					<div className={`rounded-xl border-2 bg-white p-3 ${focused ? "border-brand-400" : "border-gray-200"}`}>
						<div className="mb-1.5 text-xs font-medium text-gray-500">
							{field?.label} <span className="text-gray-400">· /fields/{fieldName}</span>
						</div>
						<iframe
							key={fieldName}
							ref={fieldFrame}
							src={`/fields/${fieldName}?appID=${APP_ID}`}
							title={fieldName}
							className="w-full border-0"
							style={{ height }}
						/>
					</div>

					<div className="mt-3 rounded-lg bg-gray-900 p-3 font-mono text-xs break-all text-green-300">
						<span className="text-gray-500">stored value = </span>
						{value ? JSON.stringify(value) : <span className="text-gray-500">&quot;&quot; (empty)</span>}
					</div>

					<details className="mt-3">
						<summary className="cursor-pointer text-xs font-medium text-gray-500">Message log</summary>
						<pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
							{log.join("\n") || "nothing yet"}
						</pre>
					</details>
				</section>

				<aside className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
					<h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Field value</h2>

					<label className="block">
						<span className="text-xs font-medium text-gray-700">Set the value directly</span>
						<input
							value={value}
							onChange={(e) => {
								setValue(e.target.value)
								valueRef.current = e.target.value
								post(fieldFrame.current, {
									appID: APP_ID,
									operationID: `${fieldName}-${APP_ID}`,
									operationType: "onFieldChanged",
									arg: { fieldValue: e.target.value }
								})
							}}
							placeholder="simulate an external edit"
							className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-xs"
						/>
					</label>
				</aside>
			</div>

			{modal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-6">
					<div className="flex h-[calc(100vh-120px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
						<div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5">
							<span className="text-sm font-semibold text-gray-900">{modal.title}</span>
							<button
								type="button"
								onClick={() => setModal(null)}
								aria-label="Close"
								className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
							>
								✕
							</button>
						</div>
						<iframe
							ref={modalFrame}
							src={`/modals/${modal.name}?appID=${APP_ID}&closeModalID=${modal.closeModalID}`}
							title={modal.name}
							className="min-h-0 w-full flex-1 border-0"
						/>
					</div>
				</div>
			)}
		</main>
	)
}
