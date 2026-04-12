import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station");
  if (!station) {
    return NextResponse.json({ error: "station is required" }, { status: 400 });
  }

  try {
    const results: Record<string, number | null> = {
      rent_1r: null,
      rent_1ldk: null,
      rent_2ldk: null,
    };

    // Search SUUMO for each layout type
    const layouts = [
      { key: "rent_1r", param: "03" }, // 1R/1K
      { key: "rent_1ldk", param: "04" }, // 1DK/1LDK
      { key: "rent_2ldk", param: "05" }, // 2K/2LDK
    ];

    for (const layout of layouts) {
      try {
        const url = `https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&ta=13&sc=&cb=0.0&ct=9999999&mb=0&mt=9999999&et=9999999&cn=9999999&shkr1=03&shkr2=03&shkr3=03&shkr4=03&sngz=&po1=25&po2=99&pc=50&fw2=${encodeURIComponent(station)}`;

        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            "Accept-Language": "ja,en;q=0.9",
          },
        });

        if (!res.ok) continue;

        const html = await res.text();

        // Extract rent prices from the page
        const priceMatches = html.match(
          /<span class="cassetteitem_other-emphasis ui-text--bold">([\d.]+)万円<\/span>/g
        );

        if (priceMatches && priceMatches.length > 0) {
          const prices = priceMatches
            .map((m) => {
              const match = m.match(/([\d.]+)万円/);
              return match ? parseFloat(match[1]) * 10000 : null;
            })
            .filter((p): p is number => p !== null);

          if (prices.length > 0) {
            const avg = Math.round(
              prices.reduce((a, b) => a + b, 0) / prices.length
            );
            results[layout.key] = avg;
          }
        }
      } catch {
        // Skip on error for this layout
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rent data" },
      { status: 500 }
    );
  }
}
