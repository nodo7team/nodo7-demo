"use client";

import { useMemo, useState } from "react";
import { CodeGenerator } from "@/components/admin/CodeGenerator";
import { CodeTable } from "@/components/admin/CodeTable";
import type { AdminCodeView } from "@/lib/demo/admin-client";
import type { AccessCodeStatus } from "@/lib/demo/types";

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "active", label: "Activos" },
  { value: "used", label: "Usados" },
  { value: "expired", label: "Vencidos" },
  { value: "revoked", label: "Revocados" },
] as const;

export function AdminConsole({ initialCodes }: { initialCodes: AdminCodeView[] }) {
  const [codes, setCodes] = useState(initialCodes);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => filter === "all" ? codes : codes.filter((code) => code.status === filter),
    [codes, filter],
  );

  async function createCode() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/demo-codes", { method: "POST" });
      const payload = (await response.json()) as { code?: string; record?: AdminCodeView; error?: string };
      if (!response.ok || !payload.code || !payload.record) throw new Error(payload.error ?? "No se pudo crear el código.");
      setNewCode(payload.code);
      setCodes((current) => [payload.record!, ...current]);
      setFilter("all");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el código.");
    } finally {
      setCreating(false);
    }
  }

  async function refresh() {
    const response = await fetch("/api/admin/demo-codes?limit=200", { cache: "no-store" });
    const payload = (await response.json()) as { codes?: AdminCodeView[]; error?: string };
    if (response.ok && payload.codes) setCodes(payload.codes);
    else setError(payload.error ?? "No se pudo actualizar.");
  }

  async function revoke(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/demo-codes/${id}/revoke`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo revocar.");
      setCodes((current) => current.map((item) => item.id === id ? { ...item, status: "revoked" } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo revocar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="n7-admin-console">
      <CodeGenerator code={newCode} busy={creating} onCreate={createCode} />
      {error ? <p className="n7-admin-error" role="alert">{error}</p> : null}
      <nav className="n7-admin-filters" aria-label="Filtrar códigos por estado">
        {STATUS_FILTERS.map((item) => (
          <button key={item.value} type="button" data-selected={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}
          </button>
        ))}
      </nav>
      <CodeTable codes={visible} busyId={busyId} onRevoke={revoke} onReplacement={createCode} onRefresh={refresh} />
    </div>
  );
}
