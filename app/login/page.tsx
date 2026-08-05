import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Administración | ClientArea by Nodo 7 OTT" };

export default function LoginPage() {
  return (
    <main className="ca-login">
      <section>
        <Image
          src="/brand/clientarea-logo.png"
          alt="ClientArea by Nodo 7 OTT"
          width={1189}
          height={379}
          priority
        />
        <p className="ca-eyebrow">Panel privado</p>
        <h1>Control de demos</h1>
        <span>Ingresa el PIN del administrador para continuar.</span>
        <LoginForm />
      </section>
    </main>
  );
}
