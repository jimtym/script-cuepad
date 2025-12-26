'use server';

import { supabaseServer } from '@/lib/supabase-server';
import type { Script } from '@/lib/types';

export async function saveScript(
  metadata: {
    script_id: string;
    title: string;
    pdf_url: string;
    total_pages: number;
    created_at: string;
  },
  userId: string
): Promise<void> {
  // Save script metadata to database (PDF already uploaded via API route)
  const { error } = await supabaseServer
    .from('scripts')
    .upsert({
      script_id: metadata.script_id,
      user_id: userId,
      title: metadata.title,
      pdf_url: metadata.pdf_url,
      total_pages: metadata.total_pages,
      created_at: metadata.created_at,
    });

  if (error) {
    console.error('Script save error:', error);
    throw new Error(`Failed to save script: ${error.message}`);
  }
}

export async function getScriptMetadata(scriptId: string, userId: string): Promise<Omit<Script, 'pdf_blob'> | null> {
  const { data, error } = await supabaseServer
    .from('scripts')
    .select('*')
    .eq('script_id', scriptId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Script fetch error:', error);
    throw new Error(`Failed to fetch script: ${error.message}`);
  }

  if (!data) return null;

  return {
    script_id: data.script_id,
    title: data.title,
    pdf_url: data.pdf_url,
    total_pages: data.total_pages,
    created_at: data.created_at,
  };
}

export async function getAllScripts(userId: string): Promise<Omit<Script, 'pdf_blob'>[]> {
  const { data, error } = await supabaseServer
    .from('scripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Scripts fetch error:', error);
    return [];
  }

  return (data || []).map(row => ({
    script_id: row.script_id,
    title: row.title,
    pdf_url: row.pdf_url,
    total_pages: row.total_pages,
    created_at: row.created_at,
  }));
}

export async function deleteScript(scriptId: string, userId: string): Promise<void> {
  const fileName = `${userId}/${scriptId}.pdf`;
  const { error: storageError } = await supabaseServer.storage
    .from('pdfs')
    .remove([fileName]);

  if (storageError) {
    console.error('PDF delete error:', storageError);
  }

  const { error } = await supabaseServer
    .from('scripts')
    .delete()
    .eq('script_id', scriptId)
    .eq('user_id', userId);

  if (error) {
    console.error('Script delete error:', error);
    throw new Error(`Failed to delete script: ${error.message}`);
  }
}
