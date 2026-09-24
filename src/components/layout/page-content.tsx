import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageContent({ className, children, ...props }: PageContentProps) {
  return (
    <div className={cn('space-y-6 pt-2', className)} {...props}>
      {children}
    </div>
  );
}
