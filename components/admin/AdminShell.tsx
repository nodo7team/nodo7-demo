import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="n7-admin-shell">
      <header className="n7-admin-header">
        <Link href="/demos" aria-label="Panel de demos NODO7">
          <Image src="/brand/nodo7-logo.png" alt="NODO7 OTT" width={800} height={216} priority />
        </Link>
        <nav>
          <Link href="/demo" target="_blank">Ver portal <ExternalLink size={15} /></Link>
          <form action="/api/auth/logout" method="post"><button type="submit">Salir <LogOut size={15} /></button></form>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
