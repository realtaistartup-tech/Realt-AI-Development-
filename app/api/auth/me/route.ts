import { NextResponse } from "next/server";

import { getSessionAccountId } from "@/lib/auth";
import { getAccountRepository } from "@/services/persistence";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ account: null });
  }

  const account = await getAccountRepository().findById(accountId);
  if (!account) {
    return NextResponse.json({ account: null });
  }

  return NextResponse.json({ account: { id: account.id, email: account.email } });
}
