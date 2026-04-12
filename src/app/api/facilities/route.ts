import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station");
  const types = request.nextUrl.searchParams.get("types");

  if (!station || !types) {
    return NextResponse.json(
      { error: "station and types are required" },
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
    // First, geocode the station to get lat/lng
    const geoUrl =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(station + " 駅")}` +
      `&language=ja` +
      `&key=${GOOGLE_PLACES_API_KEY}`;

    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return NextResponse.json({ error: "Station not found", facilities: [] });
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    // Search facilities for each type
    const typeList = types.split(",");
    const allResults: any[] = [];

    for (const type of typeList.slice(0, 3)) {
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}` +
        `&radius=1000` +
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
