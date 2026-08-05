import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ca-admin-shell">
      <header className="ca-admin-header">
        <Link href="/demos" aria-label="ClientArea by Nodo 7 OTT — panel de demos">
          <Image
            src="/brand/clientarea-logo.png"
            alt="ClientArea by Nodo 7 OTT"
            width={1189}
            height={379}
            priority
          />
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
