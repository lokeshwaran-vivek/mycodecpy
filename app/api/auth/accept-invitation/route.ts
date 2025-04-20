import { NextResponse } from "next/server";
import { acceptInvitation } from "@/app/(root)/cas/actions";
import { redirect } from "next/navigation";
import { generateChecksum } from "@/lib/utils/generate-checksum";
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }

  const response = await acceptInvitation(token);

  if (!response.success) {
    return NextResponse.json({ error: response.message }, { status: 400 });
  }

  const checksum = generateChecksum(`${process.env.NEXTAUTH_URL}/reset-password?token=${token}`);

  redirect(`/reset-password?token=${token}&checksum=${checksum}`);
}
