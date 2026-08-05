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
    <div className="ca-admin-page">
      <div className="ca-admin-title">
        <p className="ca-eyebrow">Control de accesos</p>
        <h1>Pases de demo</h1>
        <span>Emite, revoca y sigue cada pase hasta que se usa.</span>
      </div>
      <AdminConsole initialCodes={codes} />
    </div>
  );
}
