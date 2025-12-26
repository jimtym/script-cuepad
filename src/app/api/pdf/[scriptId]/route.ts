import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  const { userId } = await auth();
  const { scriptId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify user owns this script
    const { data: script, error: scriptError } = await supabaseServer
      .from('scripts')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    // Download PDF from storage
    const fileName = `${userId}/${scriptId}.pdf`;
    const { data: pdfBlob, error: downloadError } = await supabaseServer.storage
      .from('pdfs')
      .download(fileName);

    if (downloadError || !pdfBlob) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Return PDF blob
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${script.title}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
