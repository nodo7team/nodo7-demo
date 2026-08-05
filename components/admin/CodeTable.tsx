"use client";

import { Ban, Plus, RotateCw } from "lucide-react";
import { CREDENTIAL_TYPE_LABELS } from "@/components/admin/CodeGenerator";
import type { AdminCodeView } from "@/lib/demo/admin-client";
import { packageName } from "@/lib/demo/packages";

const STATUS_LABELS: Record<AdminCodeView["status"], string> = {
  pending: "Pendiente",
  active: "Activo",
  used: "Usado",
  expired: "Vencido",
  revoked: "Revocado",
};

/** "Enviado" is what the panel accepted, not what the phone received. */
const DELIVERY_LABELS: Record<
  NonNullable<AdminCodeView["request"]>["deliveryStatus"],
  string
> = {
  pending: "Sin enviar",
  sent: "Enviado",
  failed: "Falló el envío",
  disabled: "WhatsApp apagado",
};

function date(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
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
    <section className="ca-admin-table-wrap" aria-labelledby="codes-title">
      <header>
        <div>
          <p className="ca-eyebrow">Operación</p>
          <h2 id="codes-title">Códigos recientes</h2>
        </div>
        <button type="button" onClick={() => void onRefresh()}><RotateCw size={16} /> Actualizar</button>
      </header>
      {codes.length === 0 ? (
        <div className="ca-admin-empty">No hay códigos con este filtro.</div>
      ) : (
        <div className="ca-admin-table-scroll">
          <table>
            <thead><tr><th>Pase</th><th>Entrega</th><th>Estado</th><th>Visitante / demo</th><th>WhatsApp</th><th>Ventana</th><th>Red</th><th>Acción</th></tr></thead>
            <tbody>
              {codes.map((code) => {
                const revocable = code.status === "pending" || code.status === "active";
                return (
                  <tr key={code.id}>
                    <td><strong>••••-{code.displaySuffix}</strong><small>{date(code.createdAt)}</small></td>
                    <td>
                      <span className="ca-admin-type-badge" data-type={code.credentialType}>
                        {CREDENTIAL_TYPE_LABELS[code.credentialType]}
                      </span>
                    </td>
                    <td><span className="ca-admin-status" data-status={code.status}>{STATUS_LABELS[code.status]}</span></td>
                    <td>
                      <strong>{code.request?.name ?? "Sin activar"}</strong>
                      <small>{code.request ? `${packageName(code.request.packageId)} · ${code.request.username ?? code.request.status}` : "—"}</small>
                    </td>
                    <td>
                      <strong>{code.request?.maskedPhone ?? "—"}</strong>
                      <small>
                        {code.request ? DELIVERY_LABELS[code.request.deliveryStatus] : "—"}
                      </small>
                    </td>
                    <td><strong>{date(code.activatedAt)}</strong><small>{code.sessionDeadline ? `hasta ${date(code.sessionDeadline)}` : "sin reloj"}</small></td>
                    <td><strong>{code.activationIp ?? "—"}</strong><small>{code.generationAttemptCount}/3 envíos</small></td>
                    <td>
                      {revocable ? (
                        <button className="ca-admin-danger" type="button" disabled={busyId === code.id} onClick={() => void onRevoke(code.id)}>
                          <Ban size={15} /> Revocar
                        </button>
                      ) : (
                        <button className="ca-admin-action" type="button" onClick={() => void onReplacement()}>
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
