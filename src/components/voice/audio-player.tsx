'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { formatDuration } from '@/lib/voice/voice.types';

interface AudioPlayerProps {
  voiceId: string;
  initialDuration: number;
}

export function AudioPlayer({ voiceId, initialDuration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignedUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/voice/${voiceId}/play`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load audio stream');
      }
      const data = await res.json();
      return data.playbackUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Playback error';
      setError(msg);
      return null;
    }
  };

  const handlePlayToggle = async () => {
    setError(null);

    // If audio element doesn't have src yet, fetch signed URL
    if (!playbackUrl) {
      setIsLoading(true);
      const url = await fetchSignedUrl();
      setIsLoading(false);

      if (!url) return;
      setPlaybackUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
          console.error(err);
          setError('Playback blocked or unsupported format');
        });
      }
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(async () => {
        // Handle potential expired signed URL
        setIsLoading(true);
        const freshUrl = await fetchSignedUrl();
        setIsLoading(false);
        if (freshUrl && audioRef.current) {
          setPlaybackUrl(freshUrl);
          audioRef.current.src = freshUrl;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
            setError('Playback failed');
          });
        }
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => null);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="space-y-1.5 w-full rounded-lg bg-muted/30 border border-border/50 p-2.5">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
          setError('Audio playback error');
        }}
        preload="none"
      />

      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-destructive py-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setPlaybackUrl(null);
              setError(null);
              handlePlayToggle();
            }}
            className="text-xs h-6 underline ml-auto"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          {/* Play/Pause Button */}
          <Button
            type="button"
            size="icon-sm"
            variant={isPlaying ? 'default' : 'secondary'}
            onClick={handlePlayToggle}
            disabled={isLoading}
            className="h-8 w-8 shrink-0 rounded-full"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </Button>

          {/* Seekbar and Timestamps */}
          <div className="flex-1 flex flex-col justify-center space-y-1">
            <input
              type="range"
              min={0}
              max={duration || initialDuration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={!playbackUrl}
              className="w-full h-1.5 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label="Seek audio"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration || initialDuration)}</span>
            </div>
          </div>

          {/* Quick replay / volume buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleRestart}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Restart from beginning"
              aria-label="Restart from beginning"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleMute}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
