import { notFound } from "next/navigation";
import { getPublicationBySlug, toPublicPayload } from "@/lib/cas-store";
import PublicCasView from "./PublicCasView";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getPublicationBySlug(slug);
  if (!row) notFound();
  const payload = toPublicPayload(row);
  return <PublicCasView initial={payload} />;
}
