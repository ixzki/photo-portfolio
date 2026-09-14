import AdminTravelEditor from "@/components/AdminTravelEditor";
import { createEmptyTravel } from "@/lib/travel-content";
import { isAuthenticated } from "@/lib/auth";
import { isReadOnlyPreview } from "@/lib/preview-config.mjs";

export default async function NewTravelPage() {
  if (!(await isAuthenticated())) return null;
  return <AdminTravelEditor initial={createEmptyTravel()} readOnly={isReadOnlyPreview()} />;
}
