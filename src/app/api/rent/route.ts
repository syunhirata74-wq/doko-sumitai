import { NextRequest, NextResponse } from "next/server";

// 同棲向け検索条件
const SEARCH_CONDITIONS = {
  madori: "2LDK",
  area: "40m² 以上",
  walk: "駅徒歩15分以内",
  rent: "50万円以下",
  method: "中央値（外れ値除外済み）",
};

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
    // 同棲向け条件:
    // ta=13,11,14,12: 東京・埼玉・神奈川・千葉 (関東主要)
    // md=10: 2LDKのみ
    // mb=40: 40m²以上
    // et=15: 徒歩15分以内
    const url =
      `https://suumo.jp/jj/chintai/ichiran/FR301FC001/` +
      `?ar=030&bs=040` +
      `&ta=13&ta=11&ta=14&ta=12` +
      `&cb=0.0&ct=9999999` +
      `&md=10` +
      `&mb=40&mt=9999999` +
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

    // Extract rent prices from --rent class only
    const rentRegex =
      /cassetteitem_price--rent[^>]*><span[^>]*>([\d.]+)万円<\/span>/g;
    const rawPrices: number[] = [];
    let match;

    while ((match = rentRegex.exec(html)) !== null) {
      const price = parseFloat(match[1]);
      // 50万円以下のみ (タワマン・高級物件除外)
      if (price >= 3 && price <= 50) {
        rawPrices.push(price * 10000);
      }
    }

    if (rawPrices.length === 0) {
      return NextResponse.json({
        rent_avg: null,
        count: 0,
        station: cleanStation,
        conditions: SEARCH_CONDITIONS,
      });
    }

    // Remove outliers using IQR method (tight: 1.0x)
    rawPrices.sort((a, b) => a - b);
    const q1Index = Math.floor(rawPrices.length * 0.25);
    const q3Index = Math.floor(rawPrices.length * 0.75);
    const q1 = rawPrices[q1Index];
    const q3 = rawPrices[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - iqr * 1.0;
    const upperBound = q3 + iqr * 1.0;

    const filtered = rawPrices.filter(
      (p) => p >= lowerBound && p <= upperBound
    );
    const prices = filtered.length > 0 ? filtered : rawPrices;

    // Calculate median
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 0
        ? Math.round((prices[mid - 1] + prices[mid]) / 2)
        : prices[mid];

    // Min/max for range display
    const min = prices[0];
    const max = prices[prices.length - 1];

    return NextResponse.json({
      rent_avg: median,
      rent_min: min,
      rent_max: max,
      count: prices.length,
      station: cleanStation,
      conditions: SEARCH_CONDITIONS,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch rent data" },
      { status: 500 }
    );
  }
}
