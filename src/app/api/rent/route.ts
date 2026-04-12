import { NextRequest, NextResponse } from "next/server";

const SEARCH_CONDITIONS = {
  madori: "2LDK",
  walk: "駅徒歩15分以内",
  rent: "50万円以下",
  method: "中央値（外れ値除外済み）",
};

// 関東の都道府県コード（検索優先順）
const PREFECTURES = ["13", "11", "14", "12", "08", "09", "10"];

async function searchSuumo(
  station: string,
  prefCode: string
): Promise<number[]> {
  const url =
    `https://suumo.jp/jj/chintai/ichiran/FR301FC001/` +
    `?ar=030&bs=040&ta=${prefCode}` +
    `&cb=0.0&ct=9999999` +
    `&md=10` +
    `&et=15&cn=9999999` +
    `&pc=50` +
    `&fw2=${encodeURIComponent(station)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "Accept-Language": "ja,en;q=0.9",
    },
  });

  if (!res.ok) return [];

  const html = await res.text();
  const rentRegex =
    /cassetteitem_price--rent[^>]*><span[^>]*>([\d.]+)万円<\/span>/g;
  const prices: number[] = [];
  let match;

  while ((match = rentRegex.exec(html)) !== null) {
    const price = parseFloat(match[1]);
    if (price >= 3 && price <= 50) {
      prices.push(price * 10000);
    }
  }

  return prices;
}

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station");
  if (!station) {
    return NextResponse.json({ error: "station is required" }, { status: 400 });
  }

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
    // Try each prefecture until we find results
    let rawPrices: number[] = [];

    for (const pref of PREFECTURES) {
      rawPrices = await searchSuumo(cleanStation, pref);
      if (rawPrices.length >= 5) break; // Enough data found
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
