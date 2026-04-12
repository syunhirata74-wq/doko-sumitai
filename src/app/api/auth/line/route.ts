import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const LINE_CLIENT_ID = "2009776425";
const LINE_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line/callback`
  : "https://doko-sumitai.vercel.app/api/auth/line/callback";

export async function GET(request: NextRequest) {
  // Get the user's Supabase token to pass through state
  const token = request.nextUrl.searchParams.get("token") ?? "";

  const state = Buffer.from(JSON.stringify({ token })).toString("base64url");

  const lineAuthUrl =
    `https://access.line.me/oauth2/v2.1/authorize` +
    `?response_type=code` +
    `&client_id=${LINE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(LINE_REDIRECT_URI)}` +
    `&state=${state}` +
    `&scope=profile%20openid` +
    `&bot_prompt=aggressive`;

  return NextResponse.redirect(lineAuthUrl);
}
