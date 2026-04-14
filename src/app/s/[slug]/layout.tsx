import { notFound } from "next/navigation";
import { PublicPublicationHeader } from "@/components/PublicPublicationHeader";
import { getCachedPublicationBySlug } from "@/lib/cached-publication";
import { resolvePublicationPublicHeader } from "@/lib/cas-store";

export const dynamic = "force-dynamic";

export default async function PublicPublicationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getCachedPublicationBySlug(slug);
  if (!row) notFound();
  const header = resolvePublicationPublicHeader(row);
  return (
    <>
      <PublicPublicationHeader
        title={header.title}
        subtitle={header.subtitle}
        logoUrl={header.logoUrl}
        titleHref={header.titleHref}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
