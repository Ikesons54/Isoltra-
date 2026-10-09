export type Sub = 'songs' | 'hymnals' | 'chants' | 'pads' | 'saved'

/** Deep links between tabs (used by Home search, Recently played and shortcuts) */
export type Link =
  | { tab: 'library'; sub?: Sub; songId?: string; patternId?: string }
  | { tab: 'service'; serviceId?: string }
