import { cache } from "react";
import type { Journey } from "./journey";
import { isDemoPreview } from "./preview-config.mjs";
import { initialTravel } from "./travel-seed.mjs";
import { isTravelTableMissing, readPublishedTravels } from "./travel-db";

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

export const getPublishedJourneys = cache(async (): Promise<PublishedJourney[]> => readPublished());
export const getPublishedJourney = cache(async (slug: string): Promise<PublishedJourney | undefined> => (await readPublished(slug))[0]);
