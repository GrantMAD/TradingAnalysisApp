'use client';

import { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ScreenshotUploadProps {
  onUploadComplete?: (path: string) => void;
  onUploadStart?: () => void;
  onError?: (error: string) => void;
}

export function ScreenshotUpload({ onUploadComplete, onUploadStart, onError }: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and WebP are allowed.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 5MB limit.';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const errorMsg = validateFile(file);
    if (errorMsg) {
      onError?.(errorMsg);
      return;
    }

    try {
      setIsUploading(true);
      onUploadStart?.();

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const uniqueFilename = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${uniqueFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('chart-screenshots')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      onUploadComplete?.(filePath);
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      onError?.(message || 'Failed to upload screenshot');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await uploadFile(file);
    }
  };

  const clearSelection = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (previewUrl) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Chart Screenshot Preview" className="w-full h-auto max-h-[300px] object-contain bg-background" />
        
        {isUploading ? (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full w-8 h-8 opacity-80 hover:opacity-100"
            onClick={clearSelection}
            title="Remove screenshot"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
      />
      <div className="bg-primary/10 p-3 rounded-full mb-3">
        <UploadCloud className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold mb-1">Upload Chart Screenshot</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
        Drag & drop or click to upload. Max 5MB (PNG, JPEG, WebP).
      </p>
      <Button variant="outline" size="sm" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
        <ImageIcon className="w-4 h-4 mr-2" />
        Select Image
      </Button>
    </div>
  );
}
