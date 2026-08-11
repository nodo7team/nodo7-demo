import { CustomerTable } from "@/components/admin/CustomerTable";
import { toAdminCustomerView, type AdminCustomerView } from "@/lib/demo/customers";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  let customers: AdminCustomerView[] = [];
  try {
    customers = (
      await createDemoService(
        createSupabaseDemoRepository(),
      ).listAdminCustomers({ limit: 500 })
    ).map(toAdminCustomerView);
  } catch {
    // The page still renders and can retry after configuration is supplied.
  }

  return (
    <div className="ca-admin-page">
      <div className="ca-admin-title">
        <p className="ca-eyebrow">Contactos</p>
        <h1>Clientes</h1>
        <span>
          Cada persona que pidió una demo, con su WhatsApp a un clic de
          distancia.
        </span>
      </div>
      <div className="ca-admin-console">
        <CustomerTable customers={customers} />
      </div>
    </div>
  );
}
