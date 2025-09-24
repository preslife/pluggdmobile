import { Skeleton } from "@/components/ui/skeleton";

export function ReleaseCardSkeleton() {
  return (
    <div className="w-56 md:w-64 h-80 rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col">
      <Skeleton className="h-3/5 w-full" />
      <div className="p-4 flex-1 flex flex-col gap-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-auto flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}
