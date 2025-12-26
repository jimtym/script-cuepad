export interface Script {
  script_id: string;
  title: string;
  pdf_url?: string;
  pdf_blob: Blob;
  total_pages: number;
  created_at: string;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

import type { AnnotationType } from './annotation-types';

export interface BlockingEntry {
  entry_id: string;
  script_id: string;
  page_number: number;
  index_number: number;
  selection_type: 'text' | 'area';
  selection_text: string | null;
  selection_box: SelectionBox;
  blocking_text: string;
  annotation_type: AnnotationType;
  color: string; // Deprecated, kept for backward compatibility
  created_at: string;
  updated_at: string;
}

export interface HighlightMark {
  mark_id: string;
  script_id: string;
  page_number: number;
  path_data: string; // SVG path string
  color: string;
  thickness: number;
  opacity: number;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  pdf_zoom_level: number;
  highlight_preset_name: string;
  highlight_color: string;
  highlight_opacity: number;
  highlight_thickness: number;
  info_banner_dismissed: boolean;
  panel_width: number;
  updated_at: string;
}
