'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  tags,
  onChange,
  disabled = false,
  maxTags = 20,
}: TagInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addTag = (raw: string) => {
    setError(null);
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) return;

    if (!/^[a-zA-Z0-9_\-\s]+$/.test(cleaned)) {
      setError('Tags can only contain alphanumeric characters, hyphens, and underscores');
      return;
    }

    if (cleaned.length > 30) {
      setError('Tags must be 30 characters or fewer');
      return;
    }

    if (tags.includes(cleaned)) {
      setInputVal('');
      return;
    }

    if (tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    onChange([...tags, cleaned]);
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs px-2 py-0.5 inline-flex items-center gap-1 font-normal"
          >
            <span>#{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-muted-foreground hover:text-foreground rounded-full transition-colors ml-0.5"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {!disabled && tags.length < maxTags && (
          <div className="flex items-center gap-1 min-w-[140px] flex-1 max-w-xs">
            <Input
              type="text"
              placeholder="Add tag and press Enter..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="h-8 text-xs"
            />
            {inputVal.trim() && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => addTag(inputVal)}
                className="h-8 px-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
