import { NoteVisibility } from '@prisma/client';

export type { NoteVisibility };

export interface TagItem {
  id: string;
  name: string;
}

export interface NoteAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  content: string;
  snippet: string;
  visibility: NoteVisibility;
  pinned: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  tags: TagItem[];
  owner: NoteAuthor;
}

export interface NoteDetail extends NoteListItem {
  revisionCount: number;
}

export interface NoteRevisionItem {
  id: string;
  noteId: string;
  title: string;
  content: string;
  visibility: NoteVisibility;
  createdAt: string;
  authorId: string;
  author: NoteAuthor;
}

export interface NotesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotesListResponse {
  items: NoteListItem[];
  pagination: NotesPagination;
}
