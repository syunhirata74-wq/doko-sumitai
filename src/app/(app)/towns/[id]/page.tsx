"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type {
  Town,
  Spot,
  Rating,
  Profile,
  TownComment,
  SpotFavorite,
  TownRent,
} from "@/types/database";
import { RATING_CATEGORIES, SPOT_CATEGORIES } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TownDetailPage() {
  const params = useParams();
  const townId = params.id as string;
  const router = useRouter();
  const { user, profile } = useAuth();
  const [town, setTown] = useState<Town | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [comments, setComments] = useState<TownComment[]>([]);
  const [favorites, setFavorites] = useState<SpotFavorite[]>([]);
  const [rent, setRent] = useState<TownRent | null>(null);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [fetchingRent, setFetchingRent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [townId]);

  async function loadData() {
    const [townRes, spotsRes, ratingsRes, commentsRes, favoritesRes, rentRes] =
      await Promise.all([
        supabase.from("towns").select("*").eq("id", townId).single(),
        supabase
          .from("spots")
          .select("*")
          .eq("town_id", townId)
          .order("created_at", { ascending: false }),
        supabase.from("ratings").select("*").eq("town_id", townId),
        supabase
          .from("town_comments")
          .select("*")
          .eq("town_id", townId)
          .order("created_at", { ascending: true }),
        supabase.from("spot_favorites").select("*"),
        supabase
          .from("town_rents")
          .select("*")
          .eq("town_id", townId)
          .single(),
      ]);

    setTown(townRes.data);
    setSpots(spotsRes.data ?? []);
    setRatings(ratingsRes.data ?? []);
    setComments(commentsRes.data ?? []);
    setFavorites(favoritesRes.data ?? []);
    setRent(rentRes.data);

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

  async function sendComment() {
    if (!newComment.trim() || !user) return;
    setSendingComment(true);
    await supabase.from("town_comments").insert({
      town_id: townId,
      user_id: user.id,
      content: newComment.trim(),
    });
    setNewComment("");
    const { data } = await supabase
      .from("town_comments")
      .select("*")
      .eq("town_id", townId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
    setSendingComment(false);
  }

  async function toggleFavorite(spotId: string) {
    if (!user) return;
    const existing = favorites.find(
      (f) => f.spot_id === spotId && f.user_id === user.id
    );
    if (existing) {
      await supabase.from("spot_favorites").delete().eq("id", existing.id);
      setFavorites(favorites.filter((f) => f.id !== existing.id));
    } else {
      const { data } = await supabase
        .from("spot_favorites")
        .insert({ spot_id: spotId, user_id: user.id })
        .select()
        .single();
      if (data) setFavorites([...favorites, data]);
    }
  }

  async function fetchRent() {
    if (!town?.station) return;
    setFetchingRent(true);
    try {
      const res = await fetch(
        `/api/rent?station=${encodeURIComponent(town.station)}`
      );
      const data = await res.json();
      if (data.error) {
        alert("家賃データの取得に失敗しました");
        setFetchingRent(false);
        return;
      }

      if (data.rent_avg === null) {
        alert("この町の家賃データが見つかりませんでした");
        setFetchingRent(false);
        return;
      }

      // Save to DB
      const { data: saved } = await supabase
        .from("town_rents")
        .upsert(
          {
            town_id: townId,
            rent_avg: data.rent_avg,
          },
          { onConflict: "town_id" }
        )
        .select()
        .single();

      setRent(saved);
    } catch {
      alert("家賃データの取得に失敗しました");
    }
    setFetchingRent(false);
  }

  async function deleteTown() {
    if (!confirm(`「${town?.name}」を削除しますか？\nスポット・評価・コメントも全て削除されます。`)) return;
    await supabase.from("towns").delete().eq("id", townId);
    router.push("/");
  }

  function formatRent(yen: number | null): string {
    if (yen === null) return "-";
    return `${(yen / 10000).toFixed(1)}万円`;
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
            <span className="text-pink-500 font-medium">📌 行きたい</span>
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

      {/* Rent */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">💰 家賃相場</h2>
            {town.station && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRent}
                disabled={fetchingRent}
              >
                {fetchingRent
                  ? "取得中..."
                  : rent
                    ? "更新"
                    : "家賃を調べる"}
              </Button>
            )}
          </div>
          {rent && rent.rent_avg ? (
            <div className="space-y-3">
              <div className="text-center bg-muted rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  同棲向け家賃の目安
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatRent(rent.rent_avg)}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground/70 mb-1.5">検索条件</div>
                <div className="flex justify-between">
                  <span>間取り</span><span>2DK・2LDK</span>
                </div>
                <div className="flex justify-between">
                  <span>面積</span><span>40m² 以上</span>
                </div>
                <div className="flex justify-between">
                  <span>駅徒歩</span><span>15分以内</span>
                </div>
                <div className="flex justify-between">
                  <span>算出方法</span><span>中央値（外れ値除外）</span>
                </div>
                <div className="text-[10px] mt-1.5 text-center opacity-70">
                  ※SUUMOの物件検索結果より算出
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              {town.station
                ? "「家賃を調べる」で相場を取得できます"
                : "最寄り駅を設定すると家賃を調べられます"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Spots with favorites */}
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
              const spotFavs = favorites.filter(
                (f) => f.spot_id === spot.id
              );
              const iMyFav = spotFavs.some((f) => f.user_id === user?.id);
              const bothFav = spotFavs.length >= 2;

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
                      <button
                        onClick={() => toggleFavorite(spot.id)}
                        className="flex flex-col items-center justify-center gap-0.5 px-2 active:scale-90 transition-transform"
                      >
                        <span className="text-xl">
                          {bothFav ? "💕" : iMyFav ? "💗" : "🤍"}
                        </span>
                        {spotFavs.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {spotFavs.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Comments */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">💬 感想</h2>
          {comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((comment) => {
                const member = members.find((m) => m.id === comment.user_id);
                const isMe = comment.user_id === user?.id;
                return (
                  <div
                    key={comment.id}
                    className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {member?.name?.charAt(0) ?? "?"}
                    </div>
                    <div
                      className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        }`}
                      >
                        {comment.content}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 px-1">
                        {new Date(comment.created_at).toLocaleDateString(
                          "ja-JP",
                          { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2 mb-4">
              まだ感想がありません
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="感想を書く..."
              className="h-10 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendComment();
                }
              }}
            />
            <Button
              size="sm"
              onClick={sendComment}
              disabled={sendingComment || !newComment.trim()}
              className="h-10 px-4"
            >
              {sendingComment ? "..." : "送信"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete */}
      <button
        onClick={deleteTown}
        className="w-full text-center text-sm text-muted-foreground underline py-2"
      >
        この町を削除する
      </button>
    </div>
  );
}
