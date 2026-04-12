"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/map-picker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
      地図を読み込み中...
    </div>
  ),
});

export default function NewTownPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [station, setStation] = useState("");
  const [visitedAt, setVisitedAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lat, setLat] = useState(35.6812);
  const [lng, setLng] = useState(139.7671);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.couple_id) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("towns")
      .insert({
        couple_id: profile.couple_id,
        name,
        station: station || null,
        visited_at: visitedAt,
        lat,
        lng,
      })
      .select()
      .single();

    if (error) {
      alert("登録に失敗しました: " + error.message);
      setSubmitting(false);
      return;
    }

    router.push(`/towns/${data.id}`);
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">新しい町を登録</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">町の名前 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 三軒茶屋"
                required
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="station">最寄り駅</Label>
              <Input
                id="station"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="例: 三軒茶屋駅"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visited_at">訪問日</Label>
              <Input
                id="visited_at"
                type="date"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label>場所をタップで選択</Label>
              <MapPicker
                lat={lat}
                lng={lng}
                onSelect={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={submitting}
            >
              {submitting ? "登録中..." : "この町を登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
