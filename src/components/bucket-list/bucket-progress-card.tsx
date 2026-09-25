'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare } from 'lucide-react';
import type { BucketProgress } from '@/lib/bucket-list/bucket-list.types';

interface BucketProgressCardProps {
  progress: BucketProgress;
}

export function BucketProgressCard({ progress }: BucketProgressCardProps) {
  if (progress.totalCount === 0) return null;

  return (
    <Card className="border-border bg-card/60 shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Bucket List Progress
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-foreground">
                {progress.completedCount} of {progress.totalCount}
              </span>
              <span className="text-xs text-muted-foreground">completed</span>
              <span className="text-xs font-semibold text-primary ml-1">
                ({progress.percentage}%)
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
              role="progressbar"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
