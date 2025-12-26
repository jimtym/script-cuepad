export interface HighlightPreset {
  name: string;
  color: string;
  opacity: number;
  thickness: number;
  description: string;
}

export const HIGHLIGHT_PRESETS: HighlightPreset[] = [
  {
    name: 'Yellow',
    color: '#FFF59D',
    opacity: 0.5,
    thickness: 12,
    description: 'General emphasis',
  },
  {
    name: 'Light Blue',
    color: '#B3E5FC',
    opacity: 0.5,
    thickness: 12,
    description: 'Technical awareness',
  },
  {
    name: 'Light Green',
    color: '#C8E6C9',
    opacity: 0.5,
    thickness: 12,
    description: 'Blocking that works',
  },
  {
    name: 'Pink',
    color: '#F8BBD0',
    opacity: 0.5,
    thickness: 12,
    description: 'Emotional beats',
  },
  {
    name: 'Orange',
    color: '#FFE0B2',
    opacity: 0.5,
    thickness: 12,
    description: 'Needs attention',
  },
  {
    name: 'Lavender',
    color: '#E1BEE7',
    opacity: 0.5,
    thickness: 12,
    description: 'Director notes',
  },
];

export const DEFAULT_PRESET = HIGHLIGHT_PRESETS[0]; // Yellow

export function getPresetByName(name: string): HighlightPreset | undefined {
  return HIGHLIGHT_PRESETS.find(p => p.name === name);
}
