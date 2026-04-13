import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const LINE_CLIENT_ID = "2009776425";
const LINE_CLIENT_SECRET = "2cf55c65a0628afb980423d09d917a11";
const LINE_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line/callback`
  : "https://doko-sumitai.vercel.app/api/auth/line/callback";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder"
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/settings?line=error", request.url)
    );
  }

  try {
    // Parse state to get Supabase token
    const state = JSON.parse(
      Buffer.from(stateParam, "base64url").toString()
    );

    // Exchange code for LINE access token
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINE_REDIRECT_URI,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("LINE token exchange failed:", tokenRes.status, errText);
      return NextResponse.redirect(
        new URL("/settings?line=error&reason=token", request.url)
      );
    }

    const tokenData = await tokenRes.json();

    // Get LINE profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      console.error("LINE profile fetch failed:", profileRes.status);
      return NextResponse.redirect(
        new URL("/settings?line=error&reason=profile", request.url)
      );
    }

    const lineProfile = await profileRes.json();

    // Get Supabase user from token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(state.token);

    if (!user || authError) {
      console.error("Supabase auth failed:", authError?.message);
      return NextResponse.redirect(
        new URL("/settings?line=error&reason=auth", request.url)
      );
    }

    // Update profile with LINE data using service role (bypasses RLS)
    await getSupabaseAdmin().from("profiles").update({
      name: lineProfile.displayName,
      avatar_url: lineProfile.pictureUrl,
    }).eq("id", user.id);

    return NextResponse.redirect(
      new URL("/settings?line=success", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings?line=error", request.url)
    );
  }
}
