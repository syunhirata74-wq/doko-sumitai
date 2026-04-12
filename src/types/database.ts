export type Database = {
  public: {
    Tables: {
      couples: {
        Row: {
          id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          couple_id: string | null;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          couple_id?: string | null;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          couple_id?: string | null;
          name?: string;
          avatar_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
        ];
      };
      towns: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          station: string | null;
          visited_at: string;
          lat: number;
          lng: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          station?: string | null;
          visited_at: string;
          lat: number;
          lng: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          station?: string | null;
          visited_at?: string;
          lat?: number;
          lng?: number;
        };
        Relationships: [
          {
            foreignKeyName: "towns_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
        ];
      };
      spots: {
        Row: {
          id: string;
          town_id: string;
          name: string;
          category: string;
          memo: string | null;
          photo_url: string | null;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          town_id: string;
          name: string;
          category: string;
          memo?: string | null;
          photo_url?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          memo?: string | null;
          photo_url?: string | null;
          lat?: number | null;
          lng?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "spots_town_id_fkey";
            columns: ["town_id"];
            isOneToOne: false;
            referencedRelation: "towns";
            referencedColumns: ["id"];
          },
        ];
      };
      ratings: {
        Row: {
          id: string;
          town_id: string;
          user_id: string;
          living_env: number;
          transport: number;
          shopping: number;
          nature: number;
          dining: number;
          rent: number;
          overall: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          town_id: string;
          user_id: string;
          living_env: number;
          transport: number;
          shopping: number;
          nature: number;
          dining: number;
          rent: number;
          overall: number;
          created_at?: string;
        };
        Update: {
          living_env?: number;
          transport?: number;
          shopping?: number;
          nature?: number;
          dining?: number;
          rent?: number;
          overall?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_town_id_fkey";
            columns: ["town_id"];
            isOneToOne: false;
            referencedRelation: "towns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
  };
};

export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Town = Database["public"]["Tables"]["towns"]["Row"];
export type Spot = Database["public"]["Tables"]["spots"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];

export const RATING_CATEGORIES = [
  { key: "living_env", label: "住環境", icon: "🏠" },
  { key: "transport", label: "交通アク��ス", icon: "🚃" },
  { key: "shopping", label: "買い物", icon: "🛒" },
  { key: "nature", label: "自然・公園", icon: "🌳" },
  { key: "dining", label: "飲食店", icon: "🍽️" },
  { key: "rent", label: "家賃相場", icon: "💰" },
  { key: "overall", label: "総合", icon: "❤️" },
] as const;

export type RatingKey = (typeof RATING_CATEGORIES)[number]["key"];

export const SPOT_CATEGORIES = [
  { value: "cafe", label: "カフェ", icon: "☕" },
  { value: "supermarket", label: "スーパー", icon: "🛒" },
  { value: "park", label: "公園", icon: "🌳" },
  { value: "restaurant", label: "レストラン", icon: "🍽️" },
  { value: "vibe", label: "雰囲気", icon: "✨" },
  { value: "other", label: "その他", icon: "📍" },
] as const;
