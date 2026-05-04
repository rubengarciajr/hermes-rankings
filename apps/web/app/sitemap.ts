import type { MetadataRoute } from "next";
import { getAllHandles } from "@/lib/agent";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hermes-rankings.com";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${site}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${site}/docs/install`, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${site}/docs/anti-abuse`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    { url: `${site}/transparency`, changeFrequency: "weekly", priority: 0.5 },
  ];

  let agentEntries: MetadataRoute.Sitemap = [];
  try {
    const handles = await getAllHandles(1000);
    agentEntries = handles.map((h) => ({
      url: `${site}/agent/${h}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unreachable at build time — ship the static entries only.
  }

  return [...staticEntries, ...agentEntries];
}
