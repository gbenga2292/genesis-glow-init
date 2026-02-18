import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const REMOVE_BG_KEY = (import.meta.env.VITE_REMOVE_BG_API_KEY as string) || '';
const REMOVE_BG_PROXY = (import.meta.env.VITE_REMOVE_BG_PROXY_URL as string) || 'http://localhost:5210/remove-bg';

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function removeBackground(file: File, onProgress?: (p: number) => void) {
  // Use server-side proxy endpoint to protect API key. Ensure proxy is running (start:remove-bg-proxy)
  // Use XHR to provide upload progress feedback
  const proxyUrl = REMOVE_BG_PROXY;

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', proxyUrl);
    xhr.responseType = 'arraybuffer';

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        // range for this step: 0-50
        const percent = Math.round((ev.loaded / ev.total) * 50);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const arrayBuffer = xhr.response as ArrayBuffer;
        const b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        resolve(`data:image/png;base64,${b64}`);
      } else {
        const text = xhr.response ? new TextDecoder().decode(new Uint8Array(xhr.response as ArrayBuffer)) : xhr.statusText;
        reject(new Error(`remove.bg proxy error: ${xhr.status} ${text}`));
      }
    };

    xhr.onerror = () => reject(new Error('remove.bg proxy network error'));

    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file', file);
    xhr.send(formData);
  });
}

export const SignatureUpload: React.FC = () => {
  const { currentUser, hasPermission, refreshCurrentUser } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const REMOVE_BG_PROCESS = (import.meta.env.VITE_REMOVE_BG_PROCESS_URL as string) || '';
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;
    const saved = localStorage.getItem(`signature_${userId}`);
    // First check Supabase for existing signature
    (async () => {
      const remote = await (dataService.auth as any).getSignature?.(userId);
      if (remote?.success && remote.url) {
        setPreview(remote.url);
        // If local exists, remove it
        if (saved) localStorage.removeItem(`signature_${userId}`);
        return;
      }

      if (saved) {
        // migrate to Supabase
        try {
          const result = await (dataService.auth as any).uploadSignature?.(userId, saved);
          if (result?.success && result.url) {
            setPreview(result.url);
            localStorage.removeItem(`signature_${userId}`);
            return;
          }
          // fallback to local preview if upload failed
          setPreview(saved);
        } catch (e) {
          setPreview(saved);
        }
      }
    })();
  }, [userId]);

  const canSendWaybill = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return hasPermission('send_waybill') || hasPermission('send_waybill_to_site');
  };

  const uploadOriginalHandler = async () => {
    if (!selectedFile) return;
    try {
      const res = await uploadData(selectedFile);
      if (res?.url) {
        toast({ title: 'Uploaded', description: 'Signature uploaded', variant: 'default' });
        setDialogOpen(false);
        setSelectedFile(null);
        setTempPreview(null);
      }
    } catch (err: any) {
      console.error('Upload original failed', err);
    }
  };

  if (!canSendWaybill()) return null;

  // When a file is chosen, show a dialog allowing users to either upload directly
  // or request background removal and then upload.
  const handleFile = async (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    try {
      const tmp = await toDataUrl(file);
      setTempPreview(tmp);
    } catch (e) {
      console.warn('Could not generate preview', e);
      setTempPreview(null);
    }
    setDialogOpen(true);
  };

  const uploadData = async (dataToUpload: string | File) => {
    if (!userId) return null;
    setLoading(true);
    setUploadProgress(0);
    let progressTimer: any = null;
    let progressToast: any = null;
    try {
      try { progressToast = toast({ title: 'Uploading signature', description: '0%', variant: 'default' }); } catch (e) { console.warn(e); }

      let current = uploadProgress ?? 0;
      progressTimer = setInterval(() => {
        current = Math.min(90, current + Math.max(1, Math.round((100 - current) * 0.06)));
        setUploadProgress(current);
        try { progressToast?.update?.({ description: `${current}%` }); } catch (e) { }
      }, 300);

      // Try uploading the File directly if provided (more efficient). If that fails,
      // fall back to data URL upload.
      let result: any = null;
      if (dataToUpload instanceof File) {
        try {
          result = await (dataService.auth as any).uploadSignature?.(userId, dataToUpload);
        } catch (e) {
          // swallow and fallback
          console.warn('Direct file upload failed, falling back to data URL', e);
          const fallback = await toDataUrl(dataToUpload as File);
          result = await (dataService.auth as any).uploadSignature?.(userId, fallback as any);
        }
      } else {
        result = await (dataService.auth as any).uploadSignature?.(userId, dataToUpload as any);
      }

      if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
      setUploadProgress(100);

      if (result?.success && result.url) {
        setPreview(result.url);
        try { progressToast?.update?.({ title: 'Upload complete', description: '100%' }); } catch (e) { }
        toast({ title: 'Upload successful', description: 'Signature stored', variant: 'default' });
        // Refresh current user to update signature in AuthContext
        await refreshCurrentUser();
        return result;
      } else {
        // Check if it's an index size error (signature too large for database)
        const isIndexSizeError = result?.message?.includes('index row requires') ||
          result?.message?.includes('maximum size is 8191') ||
          result?.message?.includes('Signature too complex');

        const local = typeof dataToUpload === 'string' ? dataToUpload : await toDataUrl((selectedFile as File));
        localStorage.setItem(`signature_${userId}`, local);
        setPreview(local);

        if (isIndexSizeError) {
          // Treat as success - signature is saved locally
          toast({ title: 'Signature saved locally', description: 'Signature stored on this device', variant: 'default' });
          try { progressToast?.update?.({ title: 'Saved locally', description: 'Signature stored on device' }); } catch (e) { }
          return { success: true, url: local };
        } else if (result && result.message) {
          toast({ title: 'Signature upload failed', description: result.message, variant: 'destructive' });
          try { progressToast?.update?.({ title: 'Upload failed', description: result.message, variant: 'destructive' }); } catch (e) { }
        }
        return result;
      }
    } catch (e: any) {
      if (progressTimer) { clearInterval(progressTimer); }
      console.error('Signature upload error', e);
      const msg = e?.message || String(e);
      toast({ title: 'Signature upload failed', description: msg, variant: 'destructive' });
      try { progressToast?.update?.({ title: 'Upload failed', description: msg, variant: 'destructive' }); } catch (err) { }
      return null;
    } finally {
      setTimeout(() => setUploadProgress(null), 800);
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;
    if (!REMOVE_BG_PROCESS && !REMOVE_BG_KEY) {
      toast({ title: 'Background removal not configured', description: 'Set VITE_REMOVE_BG_PROCESS_URL or VITE_REMOVE_BG_API_KEY to enable', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // If a proxy/process URL is provided, prefer that. Otherwise, if a direct
      // remove.bg API key is configured, call remove.bg directly from the client.
      if (REMOVE_BG_PROCESS) {
        const dataUrl = await toDataUrl(selectedFile);
        // upload original to provide an accessible URL for the remove-bg service
        const origResult = await uploadData(dataUrl as string);
        const origUrl = origResult?.url;
        if (!origUrl) throw new Error('Failed to upload original image for processing');

        const resp = await fetch(REMOVE_BG_PROCESS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: origUrl }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Remove-bg failed: ${resp.status} ${text}`);
        }

        const ct = resp.headers.get('content-type') || '';
        let processedDataUrl: string | null = null;
        if (ct.includes('application/json')) {
          const body = await resp.json();
          if (body?.url) {
            // fetch the returned URL and convert to data URL for upload
            const fetched = await fetch(body.url);
            const ab = await fetched.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
            processedDataUrl = `data:image/png;base64,${b64}`;
          } else {
            throw new Error('Unexpected JSON from remove-bg service');
          }
        } else {
          const ab = await resp.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
          processedDataUrl = `data:image/png;base64,${b64}`;
        }

        if (!processedDataUrl) throw new Error('No processed image returned');

        const final = await uploadData(processedDataUrl);
        if (final?.url) {
          toast({ title: 'Background removed and uploaded', description: 'Signature updated', variant: 'default' });
          setDialogOpen(false);
          setSelectedFile(null);
          setTempPreview(null);
        }
      } else if (REMOVE_BG_KEY) {
        // Direct client-side call to remove.bg using API key (not recommended for public clients).
        const form = new FormData();
        form.append('size', 'auto');
        form.append('image_file', selectedFile as File);

        const resp = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': REMOVE_BG_KEY },
          body: form as any,
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`remove.bg API error: ${resp.status} ${text}`);
        }

        const ab = await resp.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
        const processedDataUrl = `data:image/png;base64,${b64}`;

        const final = await uploadData(processedDataUrl);
        if (final?.url) {
          toast({ title: 'Background removed and uploaded', description: 'Signature updated', variant: 'default' });
          setDialogOpen(false);
          setSelectedFile(null);
          setTempPreview(null);
        }
      }
    } catch (err: any) {
      console.error('Remove background error', err);
      const msg = err?.message || String(err);
      toast({ title: 'Background removal failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(null), 800);
    }
  };

  const handleRemove = () => {
    if (!userId) return;
    (async () => {
      try {
        await (dataService.auth as any).deleteSignature?.(userId);
      } catch (e) {
        console.warn('Failed to delete remote signature', e);
      }
      localStorage.removeItem(`signature_${userId}`);
      setPreview(null);
      // Refresh current user to update signature in AuthContext
      await refreshCurrentUser();
    })();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signature</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="h-24 w-full sm:w-48 flex items-center justify-center border rounded-md bg-muted/10 overflow-hidden flex-shrink-0">
            {preview ? (
              <img
                src={preview}
                alt="signature"
                className="max-h-20 object-contain"
                onError={(e) => {
                  const src = (e.currentTarget as HTMLImageElement).src;
                  console.warn('Signature preview failed to load', src);
                  setPreview(null);
                }}
              />
            ) : (
              <div className="text-sm text-muted-foreground">No signature uploaded</div>
            )}
          </div>

          <div className="flex-1 w-full text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
              <input
                id="signature-file"
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
                disabled={loading}
              />
              <label htmlFor="signature-file">
                <Button variant="default" size="sm" asChild disabled={loading}>
                  <span>{loading ? 'Uploading...' : 'Upload signature'}</span>
                </Button>
              </label>
              <Button variant="outline" size="sm" onClick={handleRemove} disabled={!preview || loading}>
                Remove
              </Button>
            </div>



            {uploadProgress !== null && (
              <div className="mt-3">
                <div className="w-full bg-muted h-2 rounded-md overflow-hidden">
                  <div style={{ width: `${uploadProgress}%` }} className="h-2 bg-blue-500 transition-all"></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</div>
              </div>
            )}

            <div className="mt-2 text-xs text-muted-foreground">Choose Upload to store the original signature, or choose Remove bg and upload to process then store.</div>
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setSelectedFile(null); setTempPreview(null); } }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload signature</DialogTitle>
                  <DialogDescription>Select action for the chosen image</DialogDescription>
                </DialogHeader>

                <div className="mt-4 flex items-center justify-center">
                  {tempPreview ? (
                    <img src={tempPreview} className="max-h-60 object-contain" alt="preview" />
                  ) : (
                    <div className="text-sm text-muted-foreground">No preview available</div>
                  )}
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="default" onClick={uploadOriginalHandler} disabled={!selectedFile || loading}>Upload</Button>
                  <Button variant="ghost" onClick={handleRemoveBackground} disabled={!selectedFile || loading}>Remove bg and upload</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignatureUpload;
