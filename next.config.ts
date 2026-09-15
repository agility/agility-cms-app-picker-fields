import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	/**
	 * A custom field is a small box in a form, and the dev indicator floats over
	 * the bottom-left corner of every iframe — which is exactly where the field's
	 * own controls are. It makes the local host unusable for judging layout.
	 */
	devIndicators: false,

	/**
	 * Agility loads this app as a cross-origin iframe inside the Manager App, so
	 * nothing here may send X-Frame-Options or a frame-ancestors CSP. Next sets
	 * neither by default — the note is here so it stays that way.
	 */
	async headers() {
		return [
			{
				// The generated icon files are immutable for a given build: the name
				// is the icon and the content only changes when the library version
				// does. The picker fetches hundreds of them, so let the browser keep
				// them rather than revalidate each one.
				source: "/icons/:path*.svg",
				headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }]
			},
			{
				// The manifest is what Agility polls to discover the app's fields.
				source: "/.well-known/agility-app.json",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=300" },
					{ key: "Access-Control-Allow-Origin", value: "*" }
				]
			}
		]
	}
}

export default nextConfig
