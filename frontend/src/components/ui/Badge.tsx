import { cn } from "@/lib/utils";

const variants = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rendering: "bg-blue-50 text-blue-700 border-blue-200",
  embedding: "bg-purple-50 text-purple-700 border-purple-200",
  indexed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

export function Badge({ className, variant, children }: { className?: string; variant: keyof typeof variants; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", variants[variant], className)}>
      {children}
    </span>
  );
}