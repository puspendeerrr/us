export type LetterStatus = 'LOCKED' | 'READY' | 'OPENED';

export interface LetterItem {
  id: string;
  authorId: string;
  authorName: string;
  recipientId: string;
  recipientName: string;
  title: string;
  content: string | null; // null if locked/unopened for recipient
  unlockAt: string;
  openedAt: string | null;
  status: LetterStatus;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LettersListResponse {
  items: LetterItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface OpenWhenSummary {
  readyCount: number;
  nextUnlockAt: string | null;
  hasLetters: boolean;
}
