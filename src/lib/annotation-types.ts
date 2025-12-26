export type AnnotationType =
  | 'Blocking'
  | 'Music Cue'
  | 'Lighting Cue'
  | 'Sound / Audio Cue'
  | 'Projection / Media'
  | 'Prop Note'
  | 'Costume Note'
  | 'Set / Scenic Note'
  | 'Director Note';

export const ANNOTATION_TYPES: AnnotationType[] = [
  'Blocking',
  'Music Cue',
  'Lighting Cue',
  'Sound / Audio Cue',
  'Projection / Media',
  'Prop Note',
  'Costume Note',
  'Set / Scenic Note',
  'Director Note',
];

export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  'Blocking': '#DAA520',           // Goldenrod
  'Music Cue': '#9C27B0',          // Purple
  'Lighting Cue': '#FFC107',       // Amber
  'Sound / Audio Cue': '#2196F3',  // Blue
  'Projection / Media': '#00BCD4', // Cyan
  'Prop Note': '#4CAF50',          // Green
  'Costume Note': '#E91E63',       // Pink
  'Set / Scenic Note': '#795548',  // Brown
  'Director Note': '#F44336',      // Red
};

export const DEFAULT_ANNOTATION_TYPE: AnnotationType = 'Blocking';

export function getAnnotationColor(type?: AnnotationType): string {
  return ANNOTATION_COLORS[type || DEFAULT_ANNOTATION_TYPE];
}
