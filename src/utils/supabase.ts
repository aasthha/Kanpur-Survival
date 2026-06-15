import { createClient } from "@supabase/supabase-js";
import { Jr } from "./date";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qpduxpnecdnuncfegkcy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_YZWwGjUEQmOrnuRQTaiAqw_H4gvDGhu";

export const $G = !!(supabaseUrl && supabaseAnonKey);
export const ND = $G
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabase = ND;

export interface UserSessionProfile {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "primary";
}

export function _J(user: any): UserSessionProfile {
  const isAastha = (user.email || "").toLowerCase().trim() === Jr.aastha.email.toLowerCase().trim();
  return {
    id: user.id,
    email: user.email || "",
    displayName: isAastha ? "Aastha" : "Dhiraj",
    role: isAastha ? "admin" : "primary",
  };
}
export const mapUserProfile = _J;

export async function B0(user: any): Promise<UserSessionProfile> {
  const profile = _J(user);
  if (ND) {
    await ND.from("profiles").upsert(
      {
        id: user.id,
        email: profile.email,
        display_name: profile.displayName,
        role: profile.role,
      },
      {
        onConflict: "id",
      }
    );
  }
  return profile;
}
export const upsertUserProfile = B0;
