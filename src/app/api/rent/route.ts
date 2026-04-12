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

  try {
    // Search SUUMO for 1LDK〜2LDK rentals (同棲向け)
    // md=07: 1LDK, md=09: 2DK, md=10: 2LDK
    const url =
      `https://suumo.jp/jj/chintai/ichiran/FR301FC001/` +
      `?ar=030&bs=040&ta=13` +
      `&cb=0.0&ct=9999999` +
      `&md=07&md=09&md=10` +
      `&et=15&cn=9999999` +
      `&pc=50` +
      `&fw2=${encodeURIComponent(cleanStation)}`;

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

    // Extract rent prices from --rent class only (not deposit/gratuity)
    const rentRegex =
      /cassetteitem_price--rent[^>]*><span[^>]*>([\d.]+)万円<\/span>/g;
    const prices: number[] = [];
    let match;

    while ((match = rentRegex.exec(html)) !== null) {
      const price = parseFloat(match[1]);
      if (price >= 3 && price <= 100) {
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

    // Calculate median for more accurate result (less affected by outliers)
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 0
        ? Math.round((prices[mid - 1] + prices[mid]) / 2)
        : prices[mid];

    return NextResponse.json({
      rent_avg: median,
      count: prices.length,
      station: cleanStation,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch rent data" },
      { status: 500 }
    );
  }
}
