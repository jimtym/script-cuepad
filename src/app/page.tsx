'use client';

import { useState, useEffect } from 'react';
import type { Script } from '@/lib/types';
import { getAllScripts, getScriptMetadata, saveScript, deleteScript } from '@/actions/scripts';
import { ScriptSetup } from '@/components/ScriptSetup';
import { BlockingPage } from '@/components/BlockingPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@clerk/nextjs';

// Client-side ID generation
function generateId(): string {
  return crypto.randomUUID();
}

type AppView = 'list' | 'setup' | 'blocking';

export default function Home() {
  const { user, isLoaded } = useUser();
  const [view, setView] = useState<AppView>('list');
  const [scripts, setScripts] = useState<Omit<Script, 'pdf_blob'>[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!isLoaded) return;

      if (user) {
        await loadScripts();
      }

      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const loadScripts = async () => {
    if (!user) return;

    const allScripts = await getAllScripts(user.id);
    setScripts(allScripts.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  };

  const handleScriptCreated = async (data: {
    title: string;
    pdfBlob: Blob;
    totalPages: number;
  }) => {
    if (!user) return;

    const scriptId = generateId();

    try {
      // Step 1: Upload PDF via API route (multipart/form-data)
      const formData = new FormData();
      formData.append('file', data.pdfBlob);
      formData.append('scriptId', scriptId);

      const uploadResponse = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload PDF');
      }

      const { url: pdfUrl } = await uploadResponse.json();

      // Step 2: Save script metadata via server action (no file)
      await saveScript(
        {
          script_id: scriptId,
          title: data.title,
          pdf_url: pdfUrl,
          total_pages: data.totalPages,
          created_at: new Date().toISOString(),
        },
        user.id
      );

      // Step 3: Fetch PDF blob for current session
      const pdfResponse = await fetch(`/api/pdf/${scriptId}`);
      const pdfBlob = await pdfResponse.blob();

      const scriptMetadata = await getScriptMetadata(scriptId, user.id);
      if (scriptMetadata) {
        setCurrentScript({
          ...scriptMetadata,
          pdf_blob: pdfBlob,
        });
      }

      await loadScripts();
      setView('blocking');
    } catch (error) {
      console.error('Error creating script:', error);
      alert('Failed to create script. Please try again.');
    }
  };

  const handleOpenScript = async (script: Omit<Script, 'pdf_blob'>) => {
    if (!user) return;

    try {
      // Fetch script metadata from server
      const scriptMetadata = await getScriptMetadata(script.script_id, user.id);
      if (!scriptMetadata) {
        alert('Script not found. It may have been deleted.');
        await loadScripts();
        return;
      }

      // Fetch PDF blob from API route
      const pdfResponse = await fetch(`/api/pdf/${script.script_id}`);
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF');
      }
      const pdfBlob = await pdfResponse.blob();

      setCurrentScript({
        ...scriptMetadata,
        pdf_blob: pdfBlob,
      });
      setView('blocking');
    } catch (error) {
      console.error('Error opening script:', error);
      alert('Failed to open script. Please try again.');
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (!user) return;

    if (confirm('Delete this script and all its cues?')) {
      await deleteScript(scriptId, user.id);
      await loadScripts();
    }
  };

  const handleExitBlocking = () => {
    setCurrentScript(null);
    setView('list');
    loadScripts();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (view === 'setup') {
    return (
      <ScriptSetup
        onScriptCreated={handleScriptCreated}
      />
    );
  }

  if (view === 'blocking' && currentScript) {
    return (
      <BlockingPage
        script={currentScript}
        onExit={handleExitBlocking}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">CuePad</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Professional script annotation for theatre directors
            </p>
          </div>
          <Button onClick={() => setView('setup')} className="w-full sm:w-auto">
            New Script
          </Button>
        </div>

        {scripts.length === 0 ? (
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Scripts Yet</h2>
            <p className="text-muted-foreground mb-4">
              Upload your first script to get started
            </p>
            <div className="space-y-3">
              <Button onClick={() => setView('setup')}>
                Upload Script
              </Button>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Need a sample PDF to test?
                </p>
                <a
                  href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download Sample PDF
                </a>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {scripts.map((script) => (
              <Card key={script.script_id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">{script.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {script.total_pages} pages
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(script.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => handleOpenScript(script)} className="flex-1 sm:flex-initial">
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteScript(script.script_id)}
                      className="flex-1 sm:flex-initial"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
