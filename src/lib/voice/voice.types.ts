import { NoteVisibility } from '@prisma/client';

export type { NoteVisibility };

export interface VoiceOwner {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

export interface VoiceMemoryItem {
  id: string;
  title: string;
  description: string | null;
  visibility: NoteVisibility;
  ownerId: string;
  owner: VoiceOwner;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  formattedDuration: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}

export interface VoicePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VoiceListResponse {
  items: VoiceMemoryItem[];
  pagination: VoicePagination;
}

/**
 * Formats duration in seconds into a clean MM:SS or HH:MM:SS string.
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

/**
 * Formats byte size into human-readable MB / KB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
