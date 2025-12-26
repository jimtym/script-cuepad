'use server';

import { supabaseServer } from '@/lib/supabase-server';
import type { BlockingEntry } from '@/lib/types';

export async function saveBlockingEntry(entry: BlockingEntry, userId: string): Promise<void> {
  const { error } = await supabaseServer
    .from('blocking_entries')
    .upsert({
      entry_id: entry.entry_id,
      script_id: entry.script_id,
      user_id: userId,
      page_number: entry.page_number,
      index_number: entry.index_number,
      selection_type: entry.selection_type,
      selection_text: entry.selection_text,
      selection_box: entry.selection_box,
      blocking_text: entry.blocking_text,
      annotation_type: entry.annotation_type,
      color: entry.color,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    });

  if (error) {
    console.error('Entry save error:', error);
    throw new Error(`Failed to save entry: ${error.message}`);
  }
}

export async function getEntriesForPage(scriptId: string, pageNumber: number, userId: string): Promise<BlockingEntry[]> {
  const { data, error } = await supabaseServer
    .from('blocking_entries')
    .select('*')
    .eq('script_id', scriptId)
    .eq('page_number', pageNumber)
    .eq('user_id', userId)
    .order('index_number', { ascending: true });

  if (error) {
    console.error('Entries fetch error:', error);
    return [];
  }

  return (data || []) as BlockingEntry[];
}

export async function deleteBlockingEntry(entryId: string, userId: string): Promise<void> {
  const { error } = await supabaseServer
    .from('blocking_entries')
    .delete()
    .eq('entry_id', entryId)
    .eq('user_id', userId);

  if (error) {
    console.error('Entry delete error:', error);
    throw new Error(`Failed to delete entry: ${error.message}`);
  }
}
