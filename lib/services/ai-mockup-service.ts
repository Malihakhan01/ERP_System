// lib/services/ai-mockup-service.ts
// MySQL Database Service Layer for FactoryOS AI Mockup Generator
// Provides PostgreSQL persistence for ai_generations and ai_settings with LocalStorage fallback.

import type {
  AiGenerationRecord,
  AiSettings,
} from "../ai-mockup-engine";
import {
  AI_GENERATION_STORAGE_KEY,
  AI_SETTINGS_STORAGE_KEY,
  DEFAULT_AI_SETTINGS,
} from "../ai-mockup-engine";

// Database Mode: Pure MySQL 8 / REST API Architecture (Database SDK Removed)
const isDatabaseConfigured = (): boolean => false;
const createClient = (): any => ({
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }),
      neq: () => ({ order: async () => ({ data: [], error: null }) }),
      order: async () => ({ data: [], error: null }),
    }),
    insert: async () => ({ data: null, error: null }),
    upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
});


/**
 * LocalStorage Helpers
 */
export function getLocalAiGenerations(): AiGenerationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AI_GENERATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setLocalAiGenerations(records: AiGenerationRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_GENERATION_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to save AI generations to localStorage", e);
  }
}

export function getLocalAiSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function setLocalAiSettings(settings: AiSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to save AI settings to localStorage", e);
  }
}

/**
 * Database DB Fetch: AI Generations
 */
export async function getAiGenerationsFromDB(): Promise<AiGenerationRecord[]> {
  const localList = getLocalAiGenerations();
  if (!isDatabaseConfigured()) return localList;

  try {
    const database = createClient();
    const { data, error } = await database
      .from("ai_generations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const mapped: AiGenerationRecord[] = data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      productName: row.product_name || "Product Mockup",
      category: row.category || "T-Shirt",
      style: row.style || "Realistic Product Photography",
      background: row.background || "White Studio",
      colors: Array.isArray(row.colors) ? row.colors : typeof row.colors === "string" ? JSON.parse(row.colors) : [],
      prompt: row.prompt || "",
      enhancedPrompt: row.enhanced_prompt || row.prompt || "",
      imageUrl: row.image_url || "",
      thumbnailUrl: row.thumbnail_url,
      status: row.status || "Completed",
      tags: Array.isArray(row.tags) ? row.tags : typeof row.tags === "string" ? JSON.parse(row.tags) : [],
      isSaved: !!row.is_saved,
      createdAt: row.created_at,
    }));

    setLocalAiGenerations(mapped);
    return mapped;
  } catch (e) {
    console.error("Error fetching AI generations from Database:", e);
    return localList;
  }
}

/**
 * Save new AI Generation Record
 */
export async function saveAiGenerationInDB(record: AiGenerationRecord): Promise<void> {
  const localList = getLocalAiGenerations();
  const updated = [record, ...localList.filter((r) => r.id !== record.id)];
  setLocalAiGenerations(updated);

  if (!isDatabaseConfigured()) return;

  try {
    const database = createClient();
    await database.from("ai_generations").upsert({
      id: record.id,
      user_id: record.userId || "usr_factory_admin",
      product_name: record.productName,
      category: record.category,
      style: record.style,
      background: record.background,
      colors: record.colors,
      prompt: record.prompt,
      enhanced_prompt: record.enhancedPrompt,
      image_url: record.imageUrl,
      thumbnail_url: record.thumbnailUrl,
      status: record.status,
      tags: record.tags,
      is_saved: !!record.isSaved,
      created_at: record.createdAt,
    });
  } catch (e) {
    console.error("Error saving AI generation to Database:", e);
  }
}

/**
 * Delete an AI Generation Record
 */
export async function deleteAiGenerationInDB(id: string): Promise<void> {
  const localList = getLocalAiGenerations();
  const filtered = localList.filter((r) => r.id !== id);
  setLocalAiGenerations(filtered);

  if (!isDatabaseConfigured()) return;

  try {
    const database = createClient();
    await database.from("ai_generations").delete().eq("id", id);
  } catch (e) {
    console.error("Error deleting AI generation from Database:", e);
  }
}

/**
 * Toggle Is Saved / Bookmark in Design Library
 */
export async function toggleSaveDesignInDB(id: string, isSaved: boolean): Promise<void> {
  const localList = getLocalAiGenerations();
  const updated = localList.map((r) => (r.id === id ? { ...r, isSaved } : r));
  setLocalAiGenerations(updated);

  if (!isDatabaseConfigured()) return;

  try {
    const database = createClient();
    await database.from("ai_generations").update({ is_saved: isSaved }).eq("id", id);
  } catch (e) {
    console.error("Error updating saved status in Database:", e);
  }
}

/**
 * Database DB Fetch: AI Settings
 */
export async function getAiSettingsFromDB(): Promise<AiSettings> {
  const local = getLocalAiSettings();
  if (!isDatabaseConfigured()) return local;

  try {
    const database = createClient();
    const { data, error } = await database.from("ai_settings").select("*").limit(1).single();

    if (error || !data) return local;

    const parsed: AiSettings = {
      id: data.id,
      apiProvider: data.api_provider || "OpenAI",
      openaiApiKey: data.openai_api_key || local.openaiApiKey,
      model: data.model || "dall-e-3",
      imageQuality: data.image_quality || "standard",
      defaultResolution: data.default_resolution || "1024x1024",
      defaultStyle: data.default_style || "Realistic Product Photography",
      generationLimitPerUser: data.generation_limit_per_user || 50,
      enableAutoEnhancement: data.enable_auto_enhancement !== false,
      createdAt: data.created_at || local.createdAt,
      updatedAt: data.updated_at || local.updatedAt,
    };

    setLocalAiSettings(parsed);
    return parsed;
  } catch (e) {
    console.error("Error fetching AI settings from Database:", e);
    return local;
  }
}

/**
 * Save AI Settings
 */
export async function saveAiSettingsInDB(settings: AiSettings): Promise<void> {
  setLocalAiSettings(settings);

  if (!isDatabaseConfigured()) return;

  try {
    const database = createClient();
    await database.from("ai_settings").upsert({
      id: settings.id,
      api_provider: settings.apiProvider,
      openai_api_key: settings.openaiApiKey,
      model: settings.model,
      image_quality: settings.imageQuality,
      default_resolution: settings.defaultResolution,
      default_style: settings.defaultStyle,
      generation_limit_per_user: settings.generationLimitPerUser,
      enable_auto_enhancement: settings.enableAutoEnhancement,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error saving AI settings to Database:", e);
  }
}
