"use client";

import { Ban, Plus, RotateCw } from "lucide-react";
import type { AdminCodeView } from "@/lib/demo/admin-client";

const STATUS_LABELS: Record<AdminCodeView["status"], string> = {
  pending: "Pendiente",
  active: "Activo",
  used: "Usado",
  expired: "Vencido",
  revoked: "Revocado",
};

function date(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

interface CodeTableProps {
  codes: AdminCodeView[];
  busyId: string | null;
  onRevoke(id: string): Promise<void>;
  onReplacement(): Promise<void>;
  onRefresh(): Promise<void>;
}

export function CodeTable({ codes, busyId, onRevoke, onReplacement, onRefresh }: CodeTableProps) {
  return (
    <section className="n7-admin-table-wrap" aria-labelledby="codes-title">
      <header>
        <div><p>OPERACIÓN</p><h2 id="codes-title">Códigos recientes</h2></div>
        <button type="button" onClick={() => void onRefresh()}><RotateCw size={16} /> Actualizar</button>
      </header>
      {codes.length === 0 ? (
        <div className="n7-admin-empty">No hay códigos con este filtro.</div>
      ) : (
        <div className="n7-admin-table-scroll">
          <table>
            <thead><tr><th>Pase</th><th>Estado</th><th>Visitante / demo</th><th>Ventana</th><th>Red</th><th>Acción</th></tr></thead>
            <tbody>
              {codes.map((code) => {
                const revocable = code.status === "pending" || code.status === "active";
                return (
                  <tr key={code.id}>
                    <td><strong>••••-{code.displaySuffix}</strong><small>{date(code.createdAt)}</small></td>
                    <td><span className="n7-admin-status" data-status={code.status}>{STATUS_LABELS[code.status]}</span></td>
                    <td>
                      <strong>{code.request?.name ?? "Sin activar"}</strong>
                      <small>{code.request ? `${code.request.packageId === 7 ? "1 hora FULL" : "4 horas"} · ${code.request.username ?? code.request.status}` : "—"}</small>
                    </td>
                    <td><strong>{date(code.activatedAt)}</strong><small>{code.sessionDeadline ? `hasta ${date(code.sessionDeadline)}` : "sin reloj"}</small></td>
                    <td><strong>{code.activationIp ?? "—"}</strong><small>{code.generationAttemptCount}/3 envíos</small></td>
                    <td>
                      {revocable ? (
                        <button className="n7-admin-danger" type="button" disabled={busyId === code.id} onClick={() => void onRevoke(code.id)}>
                          <Ban size={15} /> Revocar
                        </button>
                      ) : (
                        <button className="n7-admin-action" type="button" onClick={() => void onReplacement()}>
                          <Plus size={15} /> Crear reemplazo
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
