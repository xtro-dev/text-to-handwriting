import { DEFAULT_SETTINGS, DEFAULT_TEXT } from '../constants/presets';
import type { AppSettings, DocumentSnapshot } from '../types/handwriting';

const STATE_STORAGE_KEY = 'inkwell:document:v1';
const SAVED_SETTINGS_BACKUP_KEY = 'inkwell:saved-settings:v1';
const THEME_STORAGE_KEY = 'inkwell:theme:v1';

export type ThemeMode = 'light' | 'dark';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeWithDefaultSettings(raw: unknown): AppSettings {
  if (!isRecord(raw)) return structuredClone(DEFAULT_SETTINGS);

  const hw = isRecord(raw.handwriting) ? raw.handwriting : {};
  const pg = isRecord(raw.page) ? raw.page : {};
  const doc = isRecord(raw.document) ? raw.document : {};
  const hum = isRecord(raw.humanize) ? raw.humanize : {};

  return {
    handwriting: {
      ...DEFAULT_SETTINGS.handwriting,
      ...(hw as Partial<AppSettings['handwriting']>),
    },
    page: {
      ...DEFAULT_SETTINGS.page,
      ...(pg as Partial<AppSettings['page']>),
    },
    document: {
      ...DEFAULT_SETTINGS.document,
      ...(doc as Partial<AppSettings['document']>),
    },
    humanize: {
      ...DEFAULT_SETTINGS.humanize,
      ...(hum as Partial<AppSettings['humanize']>),
    },
  };
}

export function loadPersistedState(): DocumentSnapshot {
  if (typeof window === 'undefined') {
    return { text: DEFAULT_TEXT, settings: structuredClone(DEFAULT_SETTINGS) };
  }
  try {
    const raw = window.localStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) {
      return { text: DEFAULT_TEXT, settings: structuredClone(DEFAULT_SETTINGS) };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { text: DEFAULT_TEXT, settings: structuredClone(DEFAULT_SETTINGS) };
    }
    const text = typeof parsed.text === 'string' ? parsed.text : DEFAULT_TEXT;
    const settings = mergeWithDefaultSettings(parsed.settings);
    return { text, settings };
  } catch {
    return { text: DEFAULT_TEXT, settings: structuredClone(DEFAULT_SETTINGS) };
  }
}

export function savePersistedState(snapshot: DocumentSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function saveSettingsBackup(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SAVED_SETTINGS_BACKUP_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        settings,
      }),
    );
  } catch {
    // Ignore
  }
}

export function loadSettingsBackup(): { savedAt: number; settings: AppSettings } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_SETTINGS_BACKUP_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !('settings' in parsed)) return null;
    return {
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      settings: mergeWithDefaultSettings(parsed.settings),
    };
  } catch {
    return null;
  }
}

export function loadThemePreference(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // Ignore
  }
  return 'light';
}

export function saveThemePreference(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore
  }
}
