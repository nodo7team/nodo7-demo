import { AdminConsole } from "@/components/admin/AdminConsole";
import { toAdminCodeView, type AdminCodeView } from "@/lib/demo/admin-client";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";

export const dynamic = "force-dynamic";

export default async function DemosPage() {
  let codes: AdminCodeView[] = [];
  try {
    codes = (
      await createDemoService(createSupabaseDemoRepository()).listAdminCodes({ limit: 200 })
    ).map(toAdminCodeView);
  } catch {
    // The console still renders and can retry after configuration is supplied.
  }
  return (
    <div className="n7-admin-page">
      <div className="n7-admin-title"><p>CONTROL DE ACCESOS</p><h1>Demos NODO7</h1><span>Genera, revoca y supervisa pases de prueba.</span></div>
      <AdminConsole initialCodes={codes} />
    </div>
  );
}
