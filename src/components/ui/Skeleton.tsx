import { FC } from "react";

interface SkeletonProps {
    className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className = "" }) => (
    <div className={`animate-pulse bg-muted/60 rounded ${className}`} />
);

export const SkillCardSkeleton: FC = () => (
    <div className="apple-card p-6 flex flex-col h-full animate-in fade-in-50 duration-500">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            </div>
            <div className="flex gap-2 ml-4">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
        </div>

        {/* Description */}
        <div className="space-y-2 mb-4 h-[6.25rem]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Repository */}
        <div className="mb-4">
            <Skeleton className="h-4 w-48" />
        </div>

        {/* Paths */}
        <div className="pt-4 border-t border-border/60">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

export const SkillGridSkeleton: FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 auto-rows-fr">
        {Array.from({ length: count }).map((_, i) => (
            <SkillCardSkeleton key={i} />
        ))}
    </div>
);

interface LoadingStateProps {
    message?: string;
    showSkeleton?: boolean;
    skeletonCount?: number;
}

export const LoadingState: FC<LoadingStateProps> = ({
    message,
    showSkeleton = true,
    skeletonCount = 6,
}) => (
    <div className="space-y-6">
        {message && (
            <div className="flex items-center justify-center gap-3 py-4">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
            </div>
        )}
        {showSkeleton && <SkillGridSkeleton count={skeletonCount} />}
    </div>
);
