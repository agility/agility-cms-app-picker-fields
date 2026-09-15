import { notFound } from "next/navigation"
import { DevHost } from "@/components/dev-host.client"

/**
 * Local development only. Shipping a fake Manager App on a public URL would be
 * confusing at best, so this route does not exist in a production build.
 */
export default function Page() {
	if (process.env.NODE_ENV === "production") notFound()
	return <DevHost />
}
