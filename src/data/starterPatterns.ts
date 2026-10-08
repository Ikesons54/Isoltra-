import type { Difficulty, Pattern, PatternKind } from '../types'

export const PATTERN_SEED_VERSION = 1

export const MOODS = [
  'peaceful', 'deep', 'intimate', 'prayer', 'intercession', 'reflective', 'preaching', 'build', 'tension',
  'powerful', 'victory', 'declaration', 'altar', 'spontaneous', 'praise', 'worship', 'prophetic'
]

const make = (
  slug: string,
  kind: PatternKind,
  name: string,
  numbers: string,
  moods: string[],
  bpm: number,
  difficulty: Difficulty,
  description: string
): Pattern => ({
  id: `pat-${slug}`,
  kind,
  name,
  numbers,
  key: 'F',
  moods,
  bpm,
  timeSig: '4/4',
  difficulty,
  description,
  builtin: true,
  createdAt: 0
})

// Original generic patterns written for Isoltra (no songs, no lyrics).
export const STARTER_PATTERNS: Pattern[] = [
  make('pad-peaceful-prayer', 'pad', 'Peaceful Prayer Pad', '1 4 6 5', ['peaceful', 'prayer'], 60, 'Beginner',
    'Soft four-chord loop for quiet prayer. One chord per bar, sustain gently.'),
  make('pad-reflective-preaching', 'pad', 'Reflective Preaching Bed', '1 5 6 4', ['reflective', 'preaching'], 60, 'Beginner',
    'A calm bed to play under the message. Keep it light and low in volume.'),
  make('pad-gentle-background', 'pad', 'Gentle Background Pad', '4 5 3 6', ['preaching', 'reflective'], 56, 'Intermediate',
    'Floating, unresolved feel that stays out of the preacher\'s way.'),
  make('pad-intimate-worship', 'pad', 'Intimate Worship Bed', '1 6 4 5', ['intimate', 'worship', 'peaceful'], 64, 'Beginner',
    'Warm loop for soft, close worship moments.'),
  make('pad-deep-intercession', 'pad', 'Deep Intercession', '6 4 1 5', ['deep', 'intercession', 'prayer'], 58, 'Intermediate',
    'Starts on the relative minor for a weightier prayer atmosphere.'),
  make('pad-tension-builder', 'pad', 'Tension Builder', '1 4 5 5', ['build', 'tension', 'preaching'], 72, 'Intermediate',
    'Stays on the 5 to raise tension. Resolve to 1 when the moment lands.'),
  make('pad-victory-declaration', 'pad', 'Victory Declaration', '1 5 4 5', ['victory', 'declaration', 'powerful'], 100, 'Intermediate',
    'Open, strong movement for declarations and victory moments.'),
  make('pad-altar-call', 'pad', 'Altar Call Bed', '1 4 1 5', ['altar', 'prayer'], 66, 'Beginner',
    'Steady, simple bed that is easy to hold while people respond.'),
  make('chant-worship-01', 'chant', 'Worship Chant 01', '1 5 2 4 1', ['deep', 'worship'], 66, 'Beginner',
    'Slow chant-style loop: 1 5 2 4 1. Repeat as long as needed.'),
  make('chant-prayer', 'chant', 'Prayer Chant', '1 4 1 5', ['prayer', 'intercession'], 64, 'Beginner',
    'Plain, repetitive pattern that supports corporate prayer.'),
  make('chant-prophetic-flow', 'chant', 'Prophetic Flow', '6 4 1 5', ['prophetic', 'deep'], 62, 'Intermediate',
    'Minor-start loop for spontaneous, prophetic worship.'),
  make('chant-call-response', 'chant', 'Call and Response', '1 4 1 4', ['praise', 'spontaneous'], 72, 'Beginner',
    'Two-chord rocking pattern that leaves room for the leader and congregation to answer.'),
  make('chant-spontaneous-vamp', 'chant', 'Spontaneous Worship Vamp', '1 4 6 4', ['spontaneous', 'worship'], 68, 'Beginner',
    'Open vamp for free worship. Easy to extend and to modulate out of.'),
  make('chant-altar-vamp', 'chant', 'Altar Vamp', '1 5 6 4', ['altar', 'worship'], 66, 'Beginner',
    'Gentle loop for altar ministry time.'),
  make('chant-praise-break', 'chant', 'Praise Break', '1 4 5 1', ['praise', 'victory', 'powerful'], 110, 'Beginner',
    'Bright, driving loop for a praise break.'),
  make('chant-gospel-turnaround', 'chant', 'Gospel Turnaround Ending', '4 ♭7 2 5 1', ['victory', 'praise'], 90, 'Intermediate',
    'A 4 → ♭7 → 2 → 5 → 1 turnaround that lands on 1. Good for endings.')
]
