import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station");
  if (!station) {
    return NextResponse.json({ error: "station is required" }, { status: 400 });
  }

  // Clean up station name - handle 表記揺れ
  const cleanStation = station
    .replace(/駅$/, "")
    .replace(/[　\s]+/g, "")
    .replace(/ヶ/g, "が")
    .replace(/ケ/g, "が")
    .replace(/丁目$/, "")
    .replace(/（.*）$/, "")
    .replace(/\(.*\)$/, "")
    .trim();

  // Also try with 駅 appended for better SUUMO matching
  const searchTerm = cleanStation;

  try {
    // Search SUUMO for 2DK/2LDK/3K+ rentals (同棲向け)
    // madori: 06=2DK, 07=2LDK, 08=3K, 09=3DK, 10=3LDK
    const url = `https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&ta=13&cb=0.0&ct=9999999&mb=0&mt=9999999&et=15&cn=9999999&shkr1=03&shkr2=03&shkr3=03&shkr4=03&sngz=&po1=25&po2=99&pc=50&fw2=${encodeURIComponent(cleanStation)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "ja,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "SUUMO request failed", status: res.status },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Extract rent prices - match the --rent class specifically
    const rentRegex =
      /cassetteitem_price--rent[^>]*><span[^>]*>([\d.]+)万円<\/span>/g;
    const prices: number[] = [];
    let match;

    while ((match = rentRegex.exec(html)) !== null) {
      const price = parseFloat(match[1]);
      // Filter out obviously wrong prices (< 2万 or > 100万)
      if (price >= 2 && price <= 100) {
        prices.push(price * 10000);
      }
    }

    if (prices.length === 0) {
      return NextResponse.json({
        rent_avg: null,
        count: 0,
        station: cleanStation,
      });
    }

    // Calculate average
    const avg = Math.round(
      prices.reduce((a, b) => a + b, 0) / prices.length
    );

    return NextResponse.json({
      rent_avg: avg,
      count: prices.length,
      station: cleanStation,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rent data" },
      { status: 500 }
    );
  }
}
