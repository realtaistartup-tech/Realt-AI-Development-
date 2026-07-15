import { NextResponse } from "next/server";

import { getSessionAccountId } from "@/lib/auth";
import { getSavedSearchRepository } from "@/services/persistence";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await getSavedSearchRepository().delete(id, accountId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
