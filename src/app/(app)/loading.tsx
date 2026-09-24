export default function AppLoading() {
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-150">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted/60 rounded-md animate-pulse" />
        <div className="h-4 w-72 bg-muted/40 rounded-md animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-2">
        <div className="h-28 bg-muted/30 rounded-xl border border-border/50 animate-pulse" />
        <div className="h-28 bg-muted/30 rounded-xl border border-border/50 animate-pulse" />
        <div className="h-28 bg-muted/30 rounded-xl border border-border/50 animate-pulse" />
        <div className="h-28 bg-muted/30 rounded-xl border border-border/50 animate-pulse" />
      </div>
      <div className="h-56 bg-muted/20 rounded-xl border border-border/40 animate-pulse" />
    </div>
  );
}
