import { WsuHeader } from "@/components/WsuHeader";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <WsuHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
