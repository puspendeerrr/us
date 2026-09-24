'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Write your thoughts, memories, or notes here...',
  className,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 hover:opacity-80 transition-opacity',
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[220px] px-4 py-3 text-sm leading-relaxed',
          !editable && 'cursor-default'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  // Sync external content changes if editor content is different
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only set if actually different to prevent cursor jumps
      if (editor.getText().trim() === '' && content.trim() !== '') {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Update editable state if prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    // Cancelled
    if (url === null) return;

    // Empty URL removes link
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Add https:// if missing protocol
    const normalizedUrl = /^(https?:\/\/|mailto:)/i.test(url.trim())
      ? url.trim()
      : `https://${url.trim()}`;

    editor.chain().focus().extendMarkRange('link').setLink({ href: normalizedUrl }).run();
  }, [editor]);

  if (!mounted || !editor) {
    return (
      <div
        className={cn(
          'w-full rounded-md border border-input bg-background min-h-[260px] p-4 text-sm text-muted-foreground animate-pulse',
          className
        )}
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full rounded-md border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all',
        className
      )}
    >
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5 text-muted-foreground">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40',
              editor.isActive('bold') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40',
              editor.isActive('italic') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40',
              editor.isActive('underline') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('heading', { level: 1 }) && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('heading', { level: 2 }) && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('bulletList') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('orderedList') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('blockquote') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Quote"
            aria-label="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('code') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Inline Code"
            aria-label="Inline Code"
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={setLink}
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors',
              editor.isActive('link') && 'bg-accent text-accent-foreground font-semibold'
            )}
            title="Link"
            aria-label="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-xs font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
