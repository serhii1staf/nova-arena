import { db } from "@/db";
import { skins } from "@/db/schema";
import { ensureSkinsSeeded } from "@/lib/game-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSkinsSeeded();
    const rows = await db.select().from(skins).orderBy(skins.price);
    return Response.json({ skins: rows });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
