import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Static route list. Course slugs are added here rather than queried, so the
 * sitemap never depends on the database being reachable at build time.
 */
const COURSE_SLUGS = [
  "korean-beginner",
  "topik-1",
  "topik-2",
  "english-foundation",
  "ielts-academic",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = ["", "/courses", "/about", "/contact", "/login", "/signup"].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const courses = COURSE_SLUGS.map((slug) => ({
    url: `${siteUrl}/courses/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...pages, ...courses];
}
