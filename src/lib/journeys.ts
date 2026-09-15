import { cache } from "react";
import type { Journey } from "./journey";
import { isDemoPreview } from "./preview-config.mjs";
import { initialTravel } from "./travel-seed.mjs";
import {
  isTravelTableMissing, readPublishedTravels, readPublishedTravelSlugs,
  readPublishedTravelOverview, type PublishedJourneyOverview,
} from "./travel-db";
import { readPublicCached } from "./public-cache";

export type { PublishedJourneyOverview } from "./travel-db";

export interface PublishedJourney {
  slug: string;
  shade: string;
  journey: Journey;
  cover: { src: string; alt: string; width: number; height: number };
}

function published(document: PublishedJourney): PublishedJourney {
  return { slug: document.slug, shade: document.shade, journey: document.journey, cover: document.cover };
}

async function readPublished(slug?: string): Promise<PublishedJourney[]> {
  const fallback = () => {
    const seed = initialTravel();
    return slug === undefined || seed.slug === slug ? [published(seed)] : [];
  };
  if (isDemoPreview()) return fallback();
  try { return (await readPublishedTravels(slug)).map(published); }
  catch (error) {
    // A valid empty table means the journeys were removed/unpublished; never restore seeds then.
    if (isTravelTableMissing(error)) return fallback();
    throw error;
  }
}

const getPublishedSlugs = cache(async (): Promise<string[]> => readPublicCached("journeys", "index", async () => {
  if (isDemoPreview()) return [initialTravel().slug];
  try { return await readPublishedTravelSlugs(); }
  catch (error) {
    if (isTravelTableMissing(error)) return [initialTravel().slug];
    throw error;
  }
}));

export const getPublishedJourney = cache(async (slug: string): Promise<PublishedJourney | undefined> =>
  readPublicCached("journeys", `detail:${slug}`, async () => (await readPublished(slug))[0]),
);

export const getPublishedJourneys = cache(async (): Promise<PublishedJourney[]> => {
  const routes = await Promise.all((await getPublishedSlugs()).map(getPublishedJourney));
  return routes.filter((route): route is PublishedJourney => route !== undefined);
});

const getPublishedOverview = cache(async (slug: string): Promise<PublishedJourneyOverview | undefined> =>
  readPublicCached("journeys", `overview:${slug}`, async () => {
    const fallback = () => {
      const seed = initialTravel();
      return seed.slug === slug ? { slug, shade: seed.shade, title: seed.journey.title, segments: seed.journey.segments } : undefined;
    };
    if (isDemoPreview()) return fallback();
    try { return await readPublishedTravelOverview(slug); }
    catch (error) {
      if (isTravelTableMissing(error)) return fallback();
      throw error;
    }
  }),
);

export const getPublishedJourneyOverviews = cache(async (): Promise<PublishedJourneyOverview[]> => {
  const routes = await Promise.all((await getPublishedSlugs()).map(getPublishedOverview));
  return routes.filter((route): route is PublishedJourneyOverview => route !== undefined);
});
