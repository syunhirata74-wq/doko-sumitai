"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [myInviteCode, setMyInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const lineResult = searchParams.get("line");
    if (lineResult === "success") {
      setMessage("LINE連携が完了しました！");
      window.location.reload();
    } else if (lineResult === "error") {
      setMessage("LINE連携に失敗しました");
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile?.couple_id) {
      loadInviteCode();
    }
  }, [profile?.couple_id]);

  async function loadInviteCode() {
    const coupleId = profile?.couple_id;
    if (!coupleId) return;
    const { data } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId as string)
      .single();
    if (data) setMyInviteCode(data.invite_code);
  }

  async function createCouple() {
    if (!user) return;
    setCreating(true);
    setMessage("");

    const { data, error } = await supabase
      .from("couples")
      .insert({})
      .select()
      .single();

    if (error) {
      setMessage("作成に失敗しました");
      setCreating(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ couple_id: data.id })
      .eq("id", user.id);

    setMyInviteCode(data.invite_code);
    setMessage("カップルを作成しました！");
    setCreating(false);

    // Reload page to refresh profile
    window.location.reload();
  }

  async function joinCouple() {
    if (!user || !inviteCode.trim()) return;
    setJoining(true);
    setMessage("");

    const { data, error } = await supabase
      .from("couples")
      .select("id")
      .eq("invite_code", inviteCode.trim())
      .single();

    if (error || !data) {
      setMessage("招待コードが見つかりません");
      setJoining(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ couple_id: data.id })
      .eq("id", user.id);

    setMessage("カップルに参加しました！");
    setJoining(false);

    window.location.reload();
  }

  async function shareInviteCode() {
    if (navigator.share) {
      await navigator.share({
        title: "どこ住みたいんですか？",
        text: `招待コード: ${myInviteCode}\nアプリに参加してね！`,
      });
    } else {
      await navigator.clipboard.writeText(myInviteCode);
      setMessage("コードをコピーしました！");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">設定</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                {profile?.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <p className="font-medium">{profile?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-12 bg-[#06C755] hover:bg-[#05b34d] text-white border-0 font-medium"
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                window.location.href = `/api/auth/line?token=${session.access_token}`;
              }
            }}
          >
            {profile?.avatar_url ? "LINE プロフィールを更新" : "LINE と連携する"}
          </Button>
        </CardContent>
      </Card>

      {/* Couple */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">カップル設定</CardTitle>
          <CardDescription>
            二人でデータを共有するための設定です
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.couple_id ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  招待コード
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-lg font-mono tracking-wider">
                    {myInviteCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareInviteCode}
                  >
                    共有
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                このコードを相手に送って参加してもらいましょう
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={createCouple}
                disabled={creating}
                className="w-full h-12"
              >
                {creating ? "作成中..." : "新しいカップルを作成"}
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">または</span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite">招待コードで参加</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="コードを入力"
                    className="h-12 text-base font-mono"
                  />
                  <Button
                    onClick={joinCouple}
                    disabled={joining || !inviteCode.trim()}
                    className="h-12 px-6"
                  >
                    {joining ? "..." : "参加"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <p className="text-sm text-center text-primary">{message}</p>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-destructive"
        onClick={signOut}
      >
        ログアウト
      </Button>
    </div>
  );
}
