"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Town, Spot, Rating, Profile } from "@/types/database";
import { RATING_CATEGORIES, SPOT_CATEGORIES } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function TownDetailPage() {
  const params = useParams();
  const townId = params.id as string;
  const { user, profile } = useAuth();
  const [town, setTown] = useState<Town | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [townId]);

  async function loadData() {
    const [townRes, spotsRes, ratingsRes] = await Promise.all([
      supabase.from("towns").select("*").eq("id", townId).single(),
      supabase
        .from("spots")
        .select("*")
        .eq("town_id", townId)
        .order("created_at", { ascending: false }),
      supabase.from("ratings").select("*").eq("town_id", townId),
    ]);

    setTown(townRes.data);
    setSpots(spotsRes.data ?? []);
    setRatings(ratingsRes.data ?? []);

    if (townRes.data?.couple_id) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .eq("couple_id", townRes.data.couple_id);
      setMembers(profilesData ?? []);
    }

    setLoading(false);
  }

  function getMyRating(): Rating | undefined {
    return ratings.find((r) => r.user_id === user?.id);
  }

  function getAverageByCategory(
    key: string
  ): { avg: number; values: { name: string; value: number }[] } | null {
    if (ratings.length === 0) return null;
    const values = ratings.map((r) => {
      const member = members.find((m) => m.id === r.user_id);
      return {
        name: member?.name ?? "?",
        value: r[key as keyof Rating] as number,
      };
    });
    const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    return { avg, values };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-2xl">🏠</div>
      </div>
    );
  }

  if (!town) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        町が見つかりません
      </div>
    );
  }

  const myRating = getMyRating();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground mb-2 inline-block"
        >
          ← 戻る
        </Link>
        <h1 className="text-xl font-bold">{town.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          {town.station && <span>🚃 {town.station}</span>}
          {town.visited_at && (
            <span>
              📅 {new Date(town.visited_at).toLocaleDateString("ja-JP")}
            </span>
          )}
          {!town.visited && (
            <span className="text-orange-500 font-medium">📌 行きたい</span>
          )}
        </div>
      </div>

      {/* Rating Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">評価</h2>
            <Link href={`/towns/${townId}/rate`}>
              <Button variant="outline" size="sm">
                {myRating ? "評価を修正" : "評価する"}
              </Button>
            </Link>
          </div>
          {ratings.length > 0 ? (
            <div className="space-y-2">
              {RATING_CATEGORIES.map((cat) => {
                const result = getAverageByCategory(cat.key);
                if (!result) return null;
                return (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className="text-sm w-6">{cat.icon}</span>
                    <span className="text-sm flex-1 min-w-0 truncate">
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {result.values.map((v, i) => (
                        <span
                          key={i}
                          className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          title={v.name}
                        >
                          {v.name.charAt(0)}: {v.value}
                        </span>
                      ))}
                      <span className="text-sm font-semibold w-8 text-right">
                        {result.avg.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              まだ評価がありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* Spots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">スポット</h2>
          <Link href={`/towns/${townId}/spots/new`}>
            <Button variant="outline" size="sm">
              + 追加
            </Button>
          </Link>
        </div>
        {spots.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              気になったスポットを追加しよう
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {spots.map((spot) => {
              const cat = SPOT_CATEGORIES.find(
                (c) => c.value === spot.category
              );
              return (
                <Card key={spot.id}>
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {spot.photo_url && (
                        <img
                          src={spot.photo_url}
                          alt={spot.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cat?.icon ?? "📍"}</span>
                          <span className="font-medium text-sm truncate">
                            {spot.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {cat?.label ?? spot.category}
                        </Badge>
                        {spot.memo && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {spot.memo}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
