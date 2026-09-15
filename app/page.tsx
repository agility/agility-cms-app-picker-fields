import manifest from "@/public/.well-known/agility-app.json"

/**
 * The page you get by opening the app's own URL.
 *
 * Nobody uses it to author anything — it exists so that "is the app deployed
 * and serving the right manifest?" is answerable in a browser, which is the
 * first question whenever a field fails to show up in the CMS.
 */
export default function Home() {
	return (
		<main className="mx-auto max-w-2xl px-6 py-12">
			<h1 className="text-2xl font-semibold text-gray-900">{manifest.name}</h1>
			<p className="mt-2 text-gray-600">{manifest.description}</p>

			<h2 className="mt-9 text-xs font-semibold tracking-wide text-gray-500 uppercase">Fields</h2>
			<ul className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
				{manifest.capabilities.fields.map((field) => (
					<li key={field.name} className="px-4 py-3">
						<div className="font-medium text-gray-900">{field.label}</div>
						<div className="mt-0.5 text-sm text-gray-600">{field.description}</div>
						<code className="mt-1.5 block text-xs text-gray-400">/fields/{field.name}</code>
					</li>
				))}
			</ul>

			<h2 className="mt-9 text-xs font-semibold tracking-wide text-gray-500 uppercase">Installing</h2>
			<p className="mt-3 text-sm text-gray-600">
				In Agility, go to <strong>Settings → Apps → Add a Private App</strong> and give it this site&rsquo;s
				base URL. Agility reads the manifest from{" "}
				<a className="text-brand-700 underline" href="/.well-known/agility-app.json">
					/.well-known/agility-app.json
				</a>{" "}
				and the fields above become available as custom field types on any content model.
			</p>

			<p className="mt-8 text-sm text-gray-500">
				Icons are bundled from Lucide (ISC), Heroicons (MIT), Font Awesome Free (CC BY 4.0) and Simple Icons
				(CC0 1.0).{" "}
				<a className="text-brand-700 underline" href={manifest.documentationLink}>
					Source and documentation
				</a>
				.
			</p>
		</main>
	)
}
