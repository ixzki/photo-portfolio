import { revalidatePath, revalidateTag } from "next/cache";
import { publicCacheTag } from "./public-cache-policy";

export function invalidatePublicJourneys() {
  // Route Handlers cannot call updateTag. expire: 0 makes the next read wait
  // for fresh data instead of returning a stale published/renamed/deleted route.
  revalidateTag(publicCacheTag("journeys"), { expire: 0 });
  revalidatePath("/travel");
  revalidatePath("/travel/[slug]", "page");
  revalidatePath("/admin/travel");
}

export function invalidatePublicSettings() {
  revalidateTag(publicCacheTag("settings"), { expire: 0 });
  revalidatePath("/", "layout");
}
