'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateClient } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';

export default function NewClientPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateClient();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { name: name || undefined, phone: phone || undefined, notes: notes || undefined },
      { onSuccess: (data: any) => router.push(`/clients/${data.client.id}`) },
    );
  };

  return (
    <>
      <Topbar title="Nuevo cliente" />
      <div className="px-5 md:px-8 py-6 max-w-lg">
        <div className="bg-bg-elevated rounded-2xl shadow-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-clicktv-500/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-clicktv-500" />
            </div>
            <span className="font-bold text-fg">Nuevo cliente</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="label">Teléfono (con código de país)</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5492974601012" />
            </div>
            <div>
              <label className="label">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                placeholder="Observaciones sobre el cliente…"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={create.isPending}>Crear cliente</Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
