import { NextRequest } from "next/server";
import { getUser } from "@/lib/user";
import { listWorks, type Sort } from "@/lib/works";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const u = await getUser();
  const sp = req.nextUrl.searchParams;
  const s = sp.get("sort");
  const sort: Sort | undefined = s === "hot" || s === "new" || s === "personal" ? s : undefined;
  const items = await listWorks(u, {
    scope: "feed",
    tag: sp.get("tag") || undefined,
    q: sp.get("q") || undefined,
    sort,
  });
  return Response.json({ items });
}
