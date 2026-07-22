import { LoginForm } from './LoginForm';
import { Tv2 } from 'lucide-react';

export const metadata = { title: 'Acceso · IPTV Panel' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg relative overflow-hidden">
      {/* Fondo sutil con formas orgánicas */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-clicktv-200/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-raptor-200/30 blur-[80px]" />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-clicktv-500 to-clicktv-600 flex items-center justify-center mb-5 shadow-xl shadow-clicktv-500/20">
            <Tv2 className="h-8 w-8 text-accent-fg" />
          </div>
          <h1 className="font-display text-3xl font-bold leading-none tracking-tight text-fg">IPTV Panel</h1>
          <p className="text-xs font-medium text-fg-subtle mt-2 tracking-wide">
            Gestión unificada de líneas
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
