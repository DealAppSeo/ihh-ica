// Gives the client case page a Suspense boundary, which Next needs for useParams() under cacheComponents.
export default function Loading() {
  return <main className="p-6">Loading…</main>;
}
