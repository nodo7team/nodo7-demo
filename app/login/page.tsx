import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Administración | NODO7" };

export default function LoginPage() {
  return (
    <main className="n7-login-page">
      <section>
        <Image src="/brand/nodo7-logo.png" alt="NODO7 OTT" width={800} height={216} priority />
        <p>PANEL PRIVADO</p>
        <h1>Control de demos</h1>
        <span>Ingresa el PIN del administrador para continuar.</span>
        <LoginForm />
      </section>
    </main>
  );
}
