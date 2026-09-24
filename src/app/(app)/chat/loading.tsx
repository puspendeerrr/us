import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="h-full flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="flex-1 flex flex-col rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden min-h-0">
        {/* Chat Header Skeleton */}
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-card/80 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Message Area Skeleton */}
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          <div className="flex items-start gap-2 max-w-[70%]">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-12 w-48 rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex items-start justify-end gap-2 max-w-[70%] ml-auto">
            <Skeleton className="h-14 w-60 rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex items-start gap-2 max-w-[70%]">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-10 w-36 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Input Bar Skeleton */}
        <div className="p-3 border-t border-border/70 bg-card/80 shrink-0 flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
