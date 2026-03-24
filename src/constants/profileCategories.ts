/** Full preset list — keep profiles structured (saved to profiles.category) */
export const PROFILE_CATEGORIES = [
  'Athlete',
  'Student',
  'Writer',
  'Entrepreneur',
  'Parent',
  'Teacher',
  'Designer',
  'Doctor',
  'Engineer',
  'Artist',
  'Musician',
  'Chef',
  'Coach',
  'Other',
] as const;

export type ProfileCategory = (typeof PROFILE_CATEGORIES)[number];

export const DEFAULT_PROFILE_CATEGORY: ProfileCategory = 'Other';

export function isPresetCategory(value: string | null | undefined): value is ProfileCategory {
  if (!value) return false;
  return (PROFILE_CATEGORIES as readonly string[]).includes(value);
}

/** Map DB value → picker row + optional custom text when user chose "Other". */
export function splitCategoryFromStorage(value: string | null | undefined): {
  preset: ProfileCategory;
  customOther: string;
} {
  if (!value?.trim()) {
    return { preset: DEFAULT_PROFILE_CATEGORY, customOther: '' };
  }
  const v = value.trim();
  if (isPresetCategory(v)) {
    return { preset: v, customOther: '' };
  }
  return { preset: 'Other', customOther: v };
}

/** Value to persist: preset, or custom text when preset is Other. */
export function categoryToSave(preset: ProfileCategory, customOther: string): string {
  if (preset !== 'Other') return preset;
  const t = customOther.trim().slice(0, 48);
  return t.length > 0 ? t : 'Other';
}

export function normalizeCategory(value: string | null | undefined): ProfileCategory {
  return splitCategoryFromStorage(value).preset;
}
