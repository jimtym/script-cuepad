import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const scriptId = formData.get('scriptId') as string;

    if (!file || !scriptId) {
      return NextResponse.json({ error: 'Missing file or scriptId' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileName = `${userId}/${scriptId}.pdf`;
    const { data, error } = await supabaseServer.storage
      .from('pdfs')
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('PDF upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from('pdfs')
      .getPublicUrl(fileName);

    return NextResponse.json({
      filePath: fileName,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
