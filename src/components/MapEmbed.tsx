import { site } from "@/lib/site";

/**
 * Keyless Google Maps embed centred on the centre's listing.
 * Loads lazily so it never blocks first paint.
 */
export function MapEmbed({ title = "Map" }: { title?: string }) {
  const src = `https://maps.google.com/maps?q=${site.geo.lat},${site.geo.lng}&z=17&hl=en&output=embed`;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <iframe
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[320px] w-full border-0 sm:h-[400px]"
        allowFullScreen
      />
    </div>
  );
}
