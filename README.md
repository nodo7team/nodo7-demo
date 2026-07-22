# 📺 IPTV Panel — Gestión Unificada ClickTV + Raptor TV

Panel web para gestionar tu cartera de clientes IPTV desde un solo lugar.
Deploy en Vercel, base de datos en Supabase. Acceso con PIN de 6 dígitos. Jesús.

\---

## ✅ PASO A PASO PARA DEJARLO ANDANDO

### Paso 1 — Crear base de datos en Supabase (gratis)

1. Entrá a **https://supabase.com** y creá una cuenta (o logueate con GitHub)
2. Click en **"New Project"**

   * Nombre: `iptv-panel`
   * Password de DB: generá uno aleatorio (lo guarda Supabase, no lo necesitás)
   * Región: elegí la más cercana a vos
3. Esperá 1-2 minutos a que se cree
4. Abrí el **SQL Editor** (menú lateral izquierdo)
5. Pegá **TODO** el contenido del archivo `supabase/migrations/0001\_init.sql` y hacé click en **Run**
6. Andá a **Settings → API** (menú lateral) y copiá estos 3 valores:

   * `Project URL` → es tu `NEXT\_PUBLIC\_SUPABASE\_URL`
   * `anon public` key → es tu `NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY`
   * `service\_role` key → es tu `SUPABASE\_SERVICE\_ROLE\_KEY` (⚠️ secreto)

### Paso 2 — Generar el hash de tu PIN

Necesitás Node.js en tu PC. Abrí terminal:

```bash
cd iptv-panel
npm install
npx tsx scripts/set-pin.ts 123456
```

(Cambiá `123456` por el PIN que quieras usar)

Te va a imprimir algo así:

```
APP\_PIN\_HASH=$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Copiá ese valor completo (desde `$2a$10$...`).

### Paso 3 — Subir a GitHub

```bash
cd iptv-panel
git init
git add .
git commit -m "IPTV Panel v1"
git remote add origin https://github.com/TU\_USUARIO/iptv-panel.git
git branch -M main
git push -u origin main
```

### Paso 4 — Deploy en Vercel

1. Entrá a **https://vercel.com** (logueate con GitHub)
2. Click en **"Add New → Project"**
3. Seleccioná el repo `iptv-panel`
4. Framework: **Next.js** (se autodetecta)
5. Antes de hacer deploy, hacé click en **"Environment Variables"** y cargá estas 11 variables:

|Variable|Valor|
|-|-|
|`XUI\_API\_KEY`|Tu API key de ClickTV|
|`XUI\_BASE\_URL`|`http://dns.clicktv.online:8080/TbAzTlac/reseller/index.php`|
|`RAPTOR\_URL`|`https://ventas.raptorxyz.com`|
|`RAPTOR\_USER`|Tu usuario de Raptor|
|`RAPTOR\_PASS`|Tu contraseña de Raptor|
|`NEXT\_PUBLIC\_SUPABASE\_URL`|La URL del paso 1|
|`NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY`|La anon key del paso 1|
|`SUPABASE\_SERVICE\_ROLE\_KEY`|La service\_role key del paso 1|
|`APP\_PIN\_HASH`|El hash del paso 2|
|`SESSION\_SECRET`|Un texto aleatorio largo (mínimo 32 caracteres)|
|`CRON\_SECRET`|Otro texto aleatorio (para proteger el cron)|

6. Click en **Deploy** ✅

### Paso 5 — Verificar

1. Abrí la URL que te da Vercel
2. Ingresá tu PIN
3. Hacé click en **"Sincronizar"** para traer las líneas de ambas plataformas
4. ¡Listo!

### Paso 6 (opcional) — Importar contactos

Creá un `contacts.json`:

```json
\[
  { "name": "Juan", "phone": "+5492974601012", "username": "juantv877", "platform": "clicktv" },
  { "name": "María", "phone": "+5491155551234", "username": "maria@gmail.com", "platform": "raptor" }
]
```

```bash
export NEXT\_PUBLIC\_SUPABASE\_URL=tu\_url
export SUPABASE\_SERVICE\_ROLE\_KEY=tu\_key
npx tsx scripts/import-contacts.ts contacts.json
```

