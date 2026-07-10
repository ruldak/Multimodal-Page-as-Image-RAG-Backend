import { useHealth } from "@/hooks/useHealth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";
import { Activity, Database, Server, Cpu, Globe, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  { key: "postgresql", label: "PostgreSQL", icon: Database, description: "Primary database" },
  { key: "lancedb", label: "LanceDB", icon: Cpu, description: "Vector store" },
  { key: "redis", label: "Redis", icon: Server, description: "Task queue & cache" },
  { key: "voyage_api", label: "Voyage AI", icon: Globe, description: "Embedding API" },
  { key: "gemini_api", label: "Gemini API", icon: Activity, description: "LLM generation" },
];

export function HealthPage() {
  const { health, loading, check } = useHealth();

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">System Health</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time infrastructure monitoring</p>
        </div>
        <Button variant="outline" size="sm" onClick={check} isLoading={loading} className="self-start sm:self-auto">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-3",
            health?.status === "healthy" ? "bg-emerald-50" : "bg-red-50"
          )}>
            <Activity className={cn("w-8 h-8", health?.status === "healthy" ? "text-emerald-600" : "text-red-600")} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 capitalize">{health?.status || "—"}</h3>
          <p className="text-xs text-slate-500 mt-1">Overall System Status</p>
          {health && (
            <p className="text-[10px] text-slate-400 mt-3">Last checked: {formatDate(health.timestamp)}</p>
          )}
        </Card>

        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="w-10 h-10 rounded-lg mb-3" />
                <Skeleton className="w-24 h-5 mb-2" />
                <Skeleton className="w-32 h-3" />
              </Card>
            ))
          : services.map((svc) => {
              const status = health?.checks[svc.key] || "error";
              return (
                <Card key={svc.key} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      status === "ok" ? "bg-emerald-50" : "bg-red-50"
                    )}>
                      <svc.icon className={cn("w-5 h-5", status === "ok" ? "text-emerald-600" : "text-red-600")} />
                    </div>
                    <Badge variant={status === "ok" ? "ok" : "error"}>{status === "ok" ? "Operational" : "Down"}</Badge>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{svc.label}</h4>
                  <p className="text-xs text-slate-500 mt-1">{svc.description}</p>
                </Card>
              );
            })}
      </div>
    </div>
  );
}