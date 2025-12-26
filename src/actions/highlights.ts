'use server';

import { supabaseServer } from '@/lib/supabase-server';
import type { HighlightMark } from '@/lib/types';

export async function saveHighlightMark(mark: HighlightMark, userId: string): Promise<void> {
  const { error } = await supabaseServer
    .from('highlight_marks')
    .upsert({
      mark_id: mark.mark_id,
      script_id: mark.script_id,
      user_id: userId,
      page_number: mark.page_number,
      path_data: mark.path_data,
      color: mark.color,
      thickness: mark.thickness,
      opacity: mark.opacity,
      created_at: mark.created_at,
    });

  if (error) {
    console.error('Highlight save error:', error);
    throw new Error(`Failed to save highlight: ${error.message}`);
  }
}

export async function getHighlightsForPage(scriptId: string, pageNumber: number, userId: string): Promise<HighlightMark[]> {
  const { data, error } = await supabaseServer
    .from('highlight_marks')
    .select('*')
    .eq('script_id', scriptId)
    .eq('page_number', pageNumber)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Highlights fetch error:', error);
    return [];
  }

  return (data || []) as HighlightMark[];
}

export async function deleteHighlightMark(markId: string, userId: string): Promise<void> {
  const { error } = await supabaseServer
    .from('highlight_marks')
    .delete()
    .eq('mark_id', markId)
    .eq('user_id', userId);

  if (error) {
    console.error('Highlight delete error:', error);
    throw new Error(`Failed to delete highlight: ${error.message}`);
  }
}
