'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import type * as pdfjsLibType from 'pdfjs-dist';

let pdfjsLib: typeof pdfjsLibType | null = null;

// Initialize PDF.js on client side only
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module;
    module.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  });
}

interface ScriptSetupProps {
  onScriptCreated: (data: {
    title: string;
    pdfBlob: Blob;
    totalPages: number;
  }) => void;
}

export function ScriptSetup({ onScriptCreated }: ScriptSetupProps) {
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (!pdfjsLib) {
      setError('PDF library is loading, please try again in a moment');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      setPdfFile(file);
      setTotalPages(numPages);

      if (!title) {
        setTitle(file.name.replace('.pdf', ''));
      }
    } catch (err) {
      console.error('PDF loading error:', err);
      setError('Failed to load PDF file. Please ensure it is a valid PDF.');
      setPdfFile(null);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!pdfFile) {
      setError('Please select a PDF file');
      return;
    }

    onScriptCreated({
      title: title.trim(),
      pdfBlob: pdfFile,
      totalPages,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Script Setup</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf">PDF Script</Label>
            <Input
              id="pdf"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={loading}
            />
            {loading && <p className="text-sm text-muted-foreground">Loading PDF...</p>}
            {totalPages > 0 && (
              <p className="text-sm text-muted-foreground">PDF loaded: {totalPages} pages</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Script Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="e.g., Hamlet - First Rehearsal"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={!pdfFile || loading}>
            Create Script
          </Button>
        </form>
      </Card>
    </div>
  );
}
