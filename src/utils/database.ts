import { ND, $G, mapUserProfile } from "./supabase";
import { o0, USERS, parseUTCDate, formatUTCDateString } from "./date";
import { s as dailyMessagesList } from "./dailyMessages";

const STATE_KEY = "kanpur-chronicles-state-v2";

const initialLocalState = {
  completions: [] as any[],
  reflections: [] as any[],
  dailyMessageOverrides: [] as any[],
  settings: {} as Record<string, string>,
  surpriseMessages: [] as any[],
};

function getLocalState() {
  if (typeof window === "undefined") return initialLocalState;
  const data = window.localStorage.getItem(STATE_KEY);
  if (!data) {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(initialLocalState));
    return initialLocalState;
  }
  try {
    return { ...initialLocalState, ...JSON.parse(data) };
  } catch {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(initialLocalState));
    return initialLocalState;
  }
}

function saveLocalState(state: typeof initialLocalState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function isSupabaseUser(user: any): boolean {
  return !!($G && ND && user && user.id && !["dhiraj", "aastha"].includes(String(user.id).toLowerCase()));
}

// Compresses photo before upload
export async function compressImage(file: File, maxSize: number = 800, quality: number = 0.75): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", quality);
    };
    img.src = URL.createObjectURL(file);
  });
}
export const mR = compressImage;

// Uploads image to Supabase storage bucket
export async function uploadToStorage(file: File, folder: string): Promise<string | null> {
  if (!ND) return null;
  const compressed = await compressImage(file, 1920, 0.95);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await ND.storage.from("photos").upload(path, compressed, {
    contentType: compressed.type,
    upsert: false,
  });

  if (error) {
    console.error("Photo upload failed:", error);
    if (typeof window !== "undefined") {
      window.alert(`Photo upload failed: ${error.message || "Storage bucket 'photos' may not exist. Please create it in the Supabase dashboard and set it to public."}`);
    }
    return null;
  }

  const { data } = ND.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}
export const u = uploadToStorage;

// Retrieves all state from Supabase / Local Storage
export async function loadProjectState(user: any) {
  if (!isSupabaseUser(user) || !ND) {
    const local = getLocalState();
    const photos: Record<number, string> = {};
    const customs: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      const pUrl = local.settings[`card_photo_${i}`];
      if (pUrl) photos[i] = pUrl;
      // Extract card customs from localStorage settings
      for (const field of ["caption", "observation", "title", "unlock"]) {
        const key = `card_${field}_${i}`;
        if (local.settings[key]) customs[key] = local.settings[key];
      }
    }
    return {
      state: local,
      cardPhotos: photos,
      cardCustoms: customs,
    };
  }

  const [completionsRes, reflectionsRes, surpriseRes, overridesRes, settingsRes] = await Promise.all([
    ND.from("completions").select("date,user_id,user_name,mood,completed_at,daily_message,photo_url").order("date"),
    ND.from("reflections").select("id,date,user_id,user_name,text,created_at,photo_url").order("date"),
    ND.from("surprise_messages").select("id,title,message,unlock_date,type,created_at,photo_url").order("unlock_date"),
    ND.from("daily_message_overrides").select("date,message").order("date"),
    ND.from("app_settings").select("key,value"),
  ]);

  const appSettings: Record<string, string> = {};
  const cardPhotos: Record<number, string> = {};
  const cardCustoms: Record<string, string> = {};

  settingsRes.data?.forEach((item: any) => {
    if (item.value && item.value.length > 100000) {
      console.log(`Detected bloated base64 for key ${item.key}. Wiping...`);
      ND.from("app_settings")
        .upsert({ key: item.key, value: "" }, { onConflict: "key" })
        .then(() => console.log("Wipe complete"));
      return;
    }

    if (item.key === "hero_image") {
      appSettings.heroImage = String(item.value || "");
    } else if (item.key === "poster_title") {
      appSettings.posterTitle = String(item.value || "");
    } else if (item.key.startsWith("card_photo_")) {
      const idx = parseInt(item.key.replace("card_photo_", ""), 10);
      if (!isNaN(idx)) {
        cardPhotos[idx] = item.value;
      }
    } else if (
      item.key.startsWith("card_caption_") ||
      item.key.startsWith("card_observation_") ||
      item.key.startsWith("card_title_") ||
      item.key.startsWith("card_unlock_")
    ) {
      cardCustoms[item.key] = item.value;
    }
  });

  return {
    state: {
      completions:
        completionsRes.data?.map((c: any) => ({
          date: c.date,
          userId: c.user_id,
          userName: c.user_name === "Aastha" ? "Aastha" : "Dhiraj",
          mood: c.mood,
          completedAt: c.completed_at,
          dailyMessage: c.daily_message,
          photoUrl: c.photo_url || undefined,
        })) || [],
      reflections:
        reflectionsRes.data?.map((r: any) => ({
          id: r.id,
          date: r.date,
          userId: r.user_id,
          userName: r.user_name === "Aastha" ? "Aastha" : "Dhiraj",
          text: r.text,
          createdAt: r.created_at,
          photoUrl: r.photo_url || undefined,
        })) || [],
        surpriseMessages:
          surpriseRes.data?.map((s: any) => {
            const parts = (s.type || "").split("||");
            return {
              id: s.id,
              title: s.title,
              message: s.message,
              unlockDate: parts.length > 1 ? parts[1] : s.unlock_date,
              type: parts[0] || s.type,
              createdAt: s.created_at,
              photoUrl: s.photo_url || undefined,
            };
          }) || [],
      dailyMessageOverrides: overridesRes.data || [],
      settings: appSettings,
    },
    cardPhotos,
    cardCustoms,
  };
}
export const C7 = loadProjectState;

// Gets active daily survival message for a date
export function getDailyMessageForDate(dateStr: string, overrides: any[]): string {
  const matched = overrides.find((o: any) => o.date === dateStr);
  if (matched) return matched.message;

  const [year, month, day] = dateStr.split("-").map(Number);
  const index = (372 * year + 31 * month + day) % dailyMessagesList.length;
  return dailyMessagesList[index];
}
export const LA = getDailyMessageForDate;

// Saves completion & reflection entries
export async function saveReflection(e: {
  user: any;
  date: string;
  mood: string;
  reflection: string;
  dailyMessage: string;
  photoUrl?: string;
}) {
  const timestamp = new Date().toISOString();
  if (isSupabaseUser(e.user) && ND) {
    await Promise.all([
      ND.from("completions").upsert(
        {
          date: e.date,
          user_id: e.user.id,
          user_name: e.user.displayName,
          mood: e.mood,
          completed_at: timestamp,
          daily_message: e.dailyMessage,
          photo_url: e.photoUrl || null,
        },
        {
          onConflict: "date,user_id",
        }
      ),
      e.reflection.trim()
        ? ND.from("reflections").upsert(
            {
              date: e.date,
              user_id: e.user.id,
              user_name: e.user.displayName,
              text: e.reflection.trim(),
              photo_url: e.photoUrl || null,
            },
            {
              onConflict: "date,user_id",
            }
          )
        : Promise.resolve(),
    ]);
    return;
  }

  // Local storage backup fallback
  const local = getLocalState();
  const comps = local.completions.filter((c) => c.date !== e.date || c.userId !== e.user.id);
  const refs = e.reflection.trim()
    ? [
        ...local.reflections.filter((r) => r.date !== e.date || r.userId !== e.user.id),
        {
          id: `${e.date}-${e.user.id}`,
          date: e.date,
          userId: e.user.id,
          userName: e.user.displayName,
          text: e.reflection.trim(),
          createdAt: timestamp,
          photoUrl: e.photoUrl,
        },
      ]
    : local.reflections;

  saveLocalState({
    ...local,
    completions: [
      ...comps,
      {
        date: e.date,
        userId: e.user.id,
        userName: e.user.displayName,
        mood: e.mood,
        completedAt: timestamp,
        dailyMessage: e.dailyMessage,
        photoUrl: e.photoUrl,
      },
    ],
    reflections: refs,
  });
}
export const Qr = saveReflection;

// Deletes completion & reflection entries
export async function deleteCompletion(user: any, date: string) {
  if (isSupabaseUser(user) && ND) {
    await Promise.all([
      ND.from("completions").delete().eq("date", date).eq("user_id", user.id),
      ND.from("reflections").delete().eq("date", date).eq("user_id", user.id),
    ]);
    return;
  }

  const local = getLocalState();
  const targetId = String(user.id).toLowerCase();
  saveLocalState({
    ...local,
    completions: local.completions.filter((c) => {
      const cid = String(c.userId || c.user_id || c.userName || "").toLowerCase();
      return c.date !== date || cid !== targetId;
    }),
    reflections: local.reflections.filter((r) => {
      const rid = String(r.userId || r.user_id || r.userName || "").toLowerCase();
      return r.date !== date || rid !== targetId;
    }),
  });
}
export const deleteLog = deleteCompletion;

// Creates scheduled letter / surprise message
export async function scheduleSurpriseMessage(e: {
  id?: string;
  title: string;
  message: string;
  unlockDate: string;
  type: string;
  photoUrl?: string;
}) {
  const timestamp = new Date().toISOString();
  if ($G && ND) {
    const { error } = await ND.from("surprise_messages").upsert({
      id: e.id || "msg-" + Date.now(),
      title: e.title,
      message: e.message,
      unlock_date: e.unlockDate.split("T")[0],
      type: e.type + "||" + e.unlockDate,
      created_at: timestamp,
      photo_url: e.photoUrl || null,
    });
    if (!error) return;
    console.warn("scheduleSurpriseMessage Supabase upsert failed, falling back to localStorage:", error.message);
  }

  const local = getLocalState();
  const sId = e.id || crypto.randomUUID();
  saveLocalState({
    ...local,
    surpriseMessages: [
      ...local.surpriseMessages.filter((m) => m.id !== sId),
      {
        ...e,
        id: sId,
        createdAt: timestamp,
      },
    ],
  });
}
export const E0 = scheduleSurpriseMessage;

// Deletes a surprise message
export async function deleteSurpriseMessage(id: string) {
  if ($G && ND) {
    const { error } = await ND.from("surprise_messages").delete().eq("id", id);
    if (!error) return;
  }

  const local = getLocalState();
  saveLocalState({
    ...local,
    surpriseMessages: local.surpriseMessages.filter((m) => m.id !== id),
  });
}
export const deleteLetter = deleteSurpriseMessage;

// Saves config settings value
export async function saveSetting(key: string, value: string) {
  if ($G && ND) {
    const { error } = await ND.from("app_settings").upsert(
      {
        key,
        value,
      },
      {
        onConflict: "key",
      }
    );
    if (!error) return;
    console.warn("saveSetting Supabase upsert failed, falling back to localStorage:", error.message);
  }

  const local = getLocalState();
  saveLocalState({
    ...local,
    settings: {
      ...local.settings,
      heroImage: key === "hero_image" ? value : local.settings.heroImage,
      posterTitle: key === "poster_title" ? value : local.settings.posterTitle,
      [key]: value,
    },
  });
}
export const saveSettingExport = saveSetting;

// Saves card photo
export async function saveCardPhoto(weekNumber: number, photoUrl: string) {
  console.log("Saving card photo:", weekNumber, photoUrl);
  await saveSetting(`card_photo_${weekNumber}`, photoUrl);
}
export const il = saveCardPhoto;

// Saves card custom properties (caption, observation, etc.)
export async function saveCardCustom(weekNumber: number, field: string, value: string) {
  await saveSetting(`card_${field}_${weekNumber}`, value);
}
export const tw = saveCardCustom;

// Signs out local user
export async function localSignOut() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("kanpur-survival-current-user");
  }
}
export const l9 = localSignOut;
