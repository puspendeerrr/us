'use client';

import { useState } from 'react';
import { VoiceMemoryItem, formatDuration } from '@/lib/voice/voice.types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Lock,
  Users,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { AudioPlayer } from './audio-player';

interface VoiceCardProps {
  memory: VoiceMemoryItem;
  currentUserId: string;
  onUpdate: (
    id: string,
    data: { title: string; description?: string; visibility: 'SHARED' | 'PRIVATE' }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function VoiceCard({
  memory,
  currentUserId,
  onUpdate,
  onDelete,
}: VoiceCardProps) {
  const isOwner = memory.ownerId === currentUserId;
  const isPrivate = memory.visibility === 'PRIVATE';

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(memory.title);
  const [editDescription, setEditDescription] = useState(memory.description || '');
  const [editVisibility, setEditVisibility] = useState<'SHARED' | 'PRIVATE'>(memory.visibility);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const formattedRecordedDate = new Date(memory.recordedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleOpenEdit = () => {
    setEditTitle(memory.title);
    setEditDescription(memory.description || '');
    setEditVisibility(memory.visibility);
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError('Title is required');
      return;
    }

    try {
      setIsUpdating(true);
      setEditError(null);
      await onUpdate(memory.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        visibility: editVisibility,
      });
      setIsEditDialogOpen(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update voice memory');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDelete(memory.id);
      setIsDeleteDialogOpen(false);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete voice memory');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col justify-between hover:border-primary/40 transition-colors group relative overflow-hidden h-full bg-card">
        <CardHeader className="p-4 pb-2 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground">
              {memory.title}
            </h3>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 cursor-pointer"
                  aria-label="Memory actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenEdit} className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit details</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteError(null);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete recording</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Visibility and duration badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant={isPrivate ? 'outline' : 'secondary'}
              className="text-[11px] px-2 py-0.5 inline-flex items-center gap-1 font-normal"
            >
              {isPrivate ? (
                <>
                  <Lock className="h-3 w-3 text-amber-500" />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <Users className="h-3 w-3 text-sky-500" />
                  <span>Shared</span>
                </>
              )}
            </Badge>

            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-mono bg-muted/60 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(memory.durationSeconds)}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs ml-auto">
              <Calendar className="w-3 h-3" />
              <span>{formattedRecordedDate}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
          {memory.description ? (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {memory.description}
            </p>
          ) : (
            <div className="h-2" />
          )}

          {/* Secure Audio Player */}
          <div className="pt-2 mt-auto">
            <AudioPlayer voiceId={memory.id} initialDuration={memory.durationSeconds} />
          </div>
        </CardContent>

        <CardFooter className="px-4 py-2 bg-muted/20 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <UserIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {isOwner ? 'Recorded by you' : `By ${memory.owner.displayName}`}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Edit Voice Memory Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit Voice Memory</DialogTitle>
              <DialogDescription>
                Update the recording title, description, or visibility setting.
              </DialogDescription>
            </DialogHeader>

            {editError && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {editError}
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-title" className="text-xs font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Morning thought, Sweet voice note"
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-desc" className="text-xs font-medium text-foreground">
                  Description <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Textarea
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Notes about this recording..."
                  rows={3}
                  maxLength={2000}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVisibility('SHARED')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-all ${
                      editVisibility === 'SHARED'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Shared with Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVisibility('PRIVATE')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-all ${
                      editVisibility === 'PRIVATE'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Private to Me
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Voice Memory?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &ldquo;{memory.title}&rdquo;? This will remove the audio recording and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
