import { site } from "@/lib/site";

/**
 * Keyless Google Maps embed of the centre's listing.
 *
 * Queried by name and address rather than raw coordinates, so the pin carries
 * the centre's name instead of showing an anonymous marker. Loads lazily, so
 * it never blocks first paint.
 */
export function MapEmbed({
  title = "Map",
  address,
  directionsUrl,
  height = "h-[320px] sm:h-[400px]",
}: {
  title?: string;
  address?: string;
  directionsUrl?: string;
  height?: string;
}) {
  const query = encodeURIComponent(
    `${site.name}, ${address || "129 Mirpur Road, Dhaka 1205, Bangladesh"}`,
  );
  const src = `https://maps.google.com/maps?q=${query}&z=16&hl=en&output=embed`;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <iframe
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className={`w-full border-0 ${height}`}
        allowFullScreen
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">{site.name}</p>
          {address && <p className="text-sm text-ink-500">{address}</p>}
        </div>
        <a
          href={directionsUrl || site.mapsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-outline whitespace-nowrap px-4 py-2 text-sm"
        >
          Get directions ↗
        </a>
      </div>
    </div>
  );
}
