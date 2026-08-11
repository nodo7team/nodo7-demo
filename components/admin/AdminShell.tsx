"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, KeyRound, LogOut, Users } from "lucide-react";

const SECTIONS = [
  { href: "/demos", label: "Pases", icon: KeyRound },
  { href: "/clientes", label: "Clientes", icon: Users },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
        <nav className="ca-admin-sections" aria-label="Secciones del panel">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              data-current={pathname === section.href}
              aria-current={pathname === section.href ? "page" : undefined}
            >
              <section.icon size={15} /> {section.label}
            </Link>
          ))}
        </nav>
        <nav>
          <Link href="/demo" target="_blank">Ver portal <ExternalLink size={15} /></Link>
          <form action="/api/auth/logout" method="post"><button type="submit">Salir <LogOut size={15} /></button></form>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
