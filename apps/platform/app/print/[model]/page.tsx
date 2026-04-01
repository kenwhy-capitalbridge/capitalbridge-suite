import BaseReport from "@cb/pdf/templates/BaseReport";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const encoded = Array.isArray(resolved.data) ? resolved.data[0] : resolved.data;
  const data = JSON.parse(decodeURIComponent(encoded ?? "{}"));

  return <BaseReport data={data} />;
}
