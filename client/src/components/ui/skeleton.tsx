import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export function CardSkeleton({ height = "base" }: { height?: "sm" | "base" | "lg" }) {
  const heightClass = 
    height === "sm" ? "h-[250px]" : 
    height === "lg" ? "h-[400px]" : 
    "h-[150px]";
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className={`${heightClass} w-full`} />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px] mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}
