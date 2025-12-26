'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ANNOTATION_TYPES, DEFAULT_ANNOTATION_TYPE, getAnnotationColor, type AnnotationType } from '@/lib/annotation-types';

interface AddBlockingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string | null;
  suggestedIndex: number;
  existingIndices: number[];
  onSave: (blockingText: string, indexNumber: number, annotationType: AnnotationType) => void;
}

export function AddBlockingDialog({
  open,
  onOpenChange,
  selectedText,
  suggestedIndex,
  existingIndices,
  onSave,
}: AddBlockingDialogProps) {
  const [blockingText, setBlockingText] = useState('');
  const [indexNumber, setIndexNumber] = useState(suggestedIndex);
  const [annotationType, setAnnotationType] = useState<AnnotationType>(DEFAULT_ANNOTATION_TYPE);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setIndexNumber(suggestedIndex);
      setBlockingText('');
      setAnnotationType(DEFAULT_ANNOTATION_TYPE);
      setError('');
    }
  }, [open, suggestedIndex]);

  const handleSave = () => {
    if (!blockingText.trim()) {
      setError('Please enter cue text');
      return;
    }

    if (indexNumber < 1) {
      setError('Index must be at least 1');
      return;
    }

    if (existingIndices.includes(indexNumber)) {
      setError(`Index ${indexNumber} is already in use on this page`);
      return;
    }

    onSave(blockingText, indexNumber, annotationType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Cue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {selectedText ? (
            <div className="space-y-2">
              <Label>Trigger Text</Label>
              <div className="text-sm italic text-muted-foreground border rounded p-2 bg-gray-50">
                "{selectedText}"
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Click Location</Label>
              <div className="text-sm italic text-muted-foreground border rounded p-2 bg-gray-50">
                Position-based trigger (image-based PDF)
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="index">Index Number</Label>
            <Input
              id="index"
              type="number"
              min={1}
              value={indexNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIndexNumber(Number(e.target.value));
                setError('');
              }}
            />
            <p className="text-xs text-muted-foreground">
              Suggested: {suggestedIndex} | Used: {existingIndices.sort((a, b) => a - b).join(', ') || 'none'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="annotationType">Cue Type</Label>
            <select
              id="annotationType"
              value={annotationType}
              onChange={(e) => {
                setAnnotationType(e.target.value as AnnotationType);
                setError('');
              }}
              className="w-full border rounded px-3 py-2"
            >
              {ANNOTATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: getAnnotationColor(annotationType) }}
              />
              <span>Index marker color</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blocking">Cue Text</Label>
            <Textarea
              id="blocking"
              value={blockingText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setBlockingText(e.target.value);
                setError('');
              }}
              placeholder="Enter cue details (e.g., Hamlet crosses downstage center)"
              className="min-h-[120px]"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Cue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
