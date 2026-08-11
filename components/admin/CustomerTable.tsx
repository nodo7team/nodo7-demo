"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, RotateCw, Search, ShieldOff } from "lucide-react";
import { DELIVERY_LABELS } from "@/components/admin/CodeTable";
import {
  displayPhone,
  matchesCustomer,
  whatsappLink,
  type AdminCustomerView,
} from "@/lib/demo/customers";
import { packageName } from "@/lib/demo/packages";

function date(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}


export function CustomerTable({
  customers,
}: {
  customers: AdminCustomerView[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () => customers.filter((customer) => matchesCustomer(customer, search)),
    [customers, search],
  );

  return (
    <section className="ca-admin-table-wrap" aria-labelledby="customers-title">
      <header>
        <div>
          <p className="ca-eyebrow">Base de clientes</p>
          <h2 id="customers-title">
            {customers.length} {customers.length === 1 ? "persona" : "personas"}
          </h2>
        </div>
        <button type="button" onClick={() => router.refresh()}>
          <RotateCw size={16} /> Actualizar
        </button>
      </header>

      <div className="ca-admin-search">
        <Search aria-hidden="true" size={16} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, número, correo o país"
          aria-label="Buscar cliente"
        />
        {search ? <span>{visible.length} coinciden</span> : null}
      </div>

      {customers.length === 0 ? (
        <div className="ca-admin-empty">
          Todavía no hay clientes. Cada demo generada desde el portal suma uno.
        </div>
      ) : visible.length === 0 ? (
        <div className="ca-admin-empty">Nadie coincide con esa búsqueda.</div>
      ) : (
        <div className="ca-admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Correo</th>
                <th>País</th>
                <th>Demos</th>
                <th>Última demo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                    <small>Primera vez: {date(customer.firstSeenAt)}</small>
                  </td>
                  <td>
                    <strong className="ca-admin-phone">
                      {displayPhone(customer.phone, customer.countryIso)}
                    </strong>
                    <small>
                      {customer.lastDeliveryStatus
                        ? DELIVERY_LABELS[customer.lastDeliveryStatus]
                        : "Sin envíos"}
                    </small>
                  </td>
                  <td>
                    <strong className="ca-admin-mail">{customer.email}</strong>
                    <small>
                      {customer.marketingConsent ? (
                        "Autorizó el contacto"
                      ) : (
                        <span className="ca-admin-noconsent">
                          <ShieldOff size={12} /> Sin consentimiento
                        </span>
                      )}
                    </small>
                  </td>
                  <td>
                    <strong>{customer.countryName ?? "—"}</strong>
                    <small>{customer.countryIso ?? "—"}</small>
                  </td>
                  <td>
                    <strong>{customer.demoCount}</strong>
                    <small>{customer.deliveredCount} entregadas</small>
                  </td>
                  <td>
                    <strong>{date(customer.lastDemoAt)}</strong>
                    <small>
                      {customer.lastPackageId
                        ? packageName(customer.lastPackageId)
                        : "—"}
                    </small>
                  </td>
                  <td>
                    <a
                      className="ca-admin-action"
                      href={whatsappLink(customer.phone)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={15} /> Abrir WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
