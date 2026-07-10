import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { HealthCheck } from "@/types";

export function useHealth() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const check = async () => {
    try {
      const h = await api.health();
      setHealth(h);
    } catch (e) {
      setHealth({ status: "unhealthy", checks: {}, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  return { health, loading, check };
}