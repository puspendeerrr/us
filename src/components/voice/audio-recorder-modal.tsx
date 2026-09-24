'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NoteVisibility } from '@/lib/voice/voice.types';
import { formatDuration } from '@/lib/voice/voice.types';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Upload,
  Radio,
  FileAudio,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioRecorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type TabMode = 'record' | 'upload';

export function AudioRecorderModal({
  open,
  onOpenChange,
  onSuccess,
}: AudioRecorderModalProps) {
  const [mode, setMode] = useState<TabMode>('record');

  // Metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('SHARED');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedDuration, setDetectedDuration] = useState(0);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recorderSupported, setRecorderSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = !!(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof window.MediaRecorder !== 'undefined'
      );
      setRecorderSupported(supported);
    }
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      cleanupRecording();
      setTitle('');
      setDescription('');
      setVisibility('SHARED');
      setSelectedFile(null);
      setError(null);
      setElapsedSeconds(0);
      setAudioBlob(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [open]);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
  };

  const startRecording = async () => {
    setError(null);
    if (!recorderSupported) {
      setError("Voice recording isn't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported mimeType
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        // Calculate duration from audio object
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration && !isNaN(tempAudio.duration)) {
            setDetectedDuration(Math.round(tempAudio.duration));
          } else {
            setDetectedDuration(elapsedSeconds);
          }
        };
      };

      recorder.start(250); // timeslice 250ms
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= 600) {
            // Automatically stop at 10 minutes
            stopRecording();
            return 600;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      setError('Microphone permission denied or microphone unavailable.');
      cleanupRecording();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= 600) {
            stopRecording();
            return 600;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const discardRecording = () => {
    cleanupRecording();
    setAudioBlob(null);
    setElapsedSeconds(0);
    setDetectedDuration(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds 25 MB maximum limit');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);

    // Measure duration
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      if (tempAudio.duration && !isNaN(tempAudio.duration)) {
        const secs = Math.round(tempAudio.duration);
        if (secs > 600) {
          setError('Audio file exceeds maximum 10 minute duration limit');
          setSelectedFile(null);
          return;
        }
        setDetectedDuration(secs);
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    const fileToUpload = mode === 'record' ? audioBlob : selectedFile;
    if (!fileToUpload) {
      setError('No audio recorded or selected');
      return;
    }

    const duration = Math.max(detectedDuration || elapsedSeconds || 1, 1);
    if (duration > 600) {
      setError('Audio cannot exceed 10 minutes');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('audio', fileToUpload, mode === 'record' ? 'recording.webm' : selectedFile?.name || 'audio.mp3');
      formData.append('title', trimmedTitle);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('visibility', visibility);
      formData.append('durationSeconds', duration.toString());
      formData.append('recordedAt', new Date().toISOString());

      const res = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save voice memory');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold">
            {mode === 'record' ? 'Record Voice Memory' : 'Upload Audio File'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Save a voice note, message, or memory for your private space.
          </DialogDescription>

          {/* Mode Switcher */}
          {!isRecording && !audioBlob && (
            <div className="flex items-center gap-1 mt-2 p-0.5 bg-muted rounded-lg text-xs">
              <button
                type="button"
                onClick={() => { setMode('record'); setError(null); }}
                className={cn(
                  'flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5',
                  mode === 'record' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Microphone</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('upload'); setError(null); }}
                className={cn(
                  'flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5',
                  mode === 'upload' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileAudio className="h-3.5 w-3.5" />
                <span>File Upload</span>
              </button>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* RECORDING MODE */}
          {mode === 'record' && (
            <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-xl bg-muted/20 space-y-3">
              {!recorderSupported ? (
                <p className="text-xs text-destructive text-center py-4">
                  Voice recording isn&apos;t supported in this browser.
                </p>
              ) : !audioBlob ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-3 w-3 rounded-full', isRecording ? 'bg-destructive animate-pulse' : 'bg-muted-foreground/30')} />
                    <span className="font-mono text-xl font-bold tracking-tight">
                      {formatDuration(elapsedSeconds)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 10:00</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        onClick={startRecording}
                        className="gap-2 h-9 px-4 text-xs font-semibold rounded-full"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Start Recording</span>
                      </Button>
                    ) : (
                      <>
                        {isPaused ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resumeRecording}
                            className="gap-1.5 h-8 text-xs"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Resume</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={pauseRecording}
                            className="gap-1.5 h-8 text-xs"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            <span>Pause</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={stopRecording}
                          className="gap-1.5 h-8 text-xs"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          <span>Stop</span>
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Recorded ({formatDuration(detectedDuration || elapsedSeconds)})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={discardRecording}
                      className="text-muted-foreground hover:text-destructive text-xs h-6 gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Re-record</span>
                    </Button>
                  </div>
                  {previewUrl && (
                    <audio src={previewUrl} controls className="w-full h-9 rounded" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* FILE UPLOAD MODE */}
          {mode === 'upload' && (
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer text-center relative">
                <input
                  type="file"
                  accept="audio/*,.webm,.ogg,.mp4,.mp3,.wav,.m4a,.aac"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-foreground">
                  {selectedFile ? selectedFile.name : 'Click or drop audio file here'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Supported formats: MP3, WAV, WebM, OGG, M4A, AAC (Max 25 MB, 10 mins)
                </p>
              </div>

              {previewUrl && selectedFile && (
                <div className="space-y-1.5 p-2 rounded bg-muted/30 border border-border/60">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Duration: {formatDuration(detectedDuration)}</span>
                    <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <audio src={previewUrl} controls className="w-full h-8" />
                </div>
              )}
            </div>
          )}

          {/* METADATA FIELDS */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="voice-title" className="text-xs font-semibold text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="voice-title"
                placeholder="e.g. Good morning voice note, Sunday laugh..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="voice-description" className="text-xs font-semibold text-foreground">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                id="voice-description"
                placeholder="Add context or notes about this recording..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Visibility Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('SHARED')}
                  className={cn(
                    'p-2.5 rounded-lg border text-left text-xs transition-colors flex items-start gap-2',
                    visibility === 'SHARED'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <Globe className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Shared</div>
                    <div className="text-[10px] text-muted-foreground leading-snug">
                      Both you and your partner can listen
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={cn(
                    'p-2.5 rounded-lg border text-left text-xs transition-colors flex items-start gap-2',
                    visibility === 'PRIVATE'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <Lock className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Private</div>
                    <div className="text-[10px] text-muted-foreground leading-snug">
                      Only you can view and play this note
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading || (!audioBlob && !selectedFile)}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Save Voice Memory'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
