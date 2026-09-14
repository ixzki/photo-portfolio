import { notFound } from "next/navigation";
import AdminTravelEditor from "@/components/AdminTravelEditor";
import { getTravelById } from "@/lib/travel-db";
import { isAuthenticated } from "@/lib/auth";
import { isReadOnlyPreview } from "@/lib/preview-config.mjs";

export default async function EditTravelPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return null;
  const { id } = await params;
  const travel = await getTravelById(id);
  if (!travel) notFound();
  return <AdminTravelEditor initial={travel} readOnly={isReadOnlyPreview()} />;
}
