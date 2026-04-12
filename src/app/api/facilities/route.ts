import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const types = request.nextUrl.searchParams.get("types"); // comma-separated

  if (!lat || !lng || !types) {
    return NextResponse.json(
      { error: "lat, lng, and types are required" },
      { status: 400 }
    );
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 503 }
    );
  }

  try {
    const typeList = types.split(",");
    const allResults: any[] = [];

    for (const type of typeList.slice(0, 3)) {
      // Limit to 3 types per request
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}` +
        `&radius=1000` + // 1km radius
        `&type=${type.trim()}` +
        `&language=ja` +
        `&key=${GOOGLE_PLACES_API_KEY}`;

      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      if (data.results) {
        for (const place of data.results.slice(0, 10)) {
          allResults.push({
            name: place.name,
            type: type.trim(),
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            rating: place.rating ?? null,
            address: place.vicinity ?? null,
          });
        }
      }
    }

    return NextResponse.json({ facilities: allResults });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch facilities" },
      { status: 500 }
    );
  }
}
