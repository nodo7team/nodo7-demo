# NODO7 ClickTV Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar la creación de demos al contrato vigente de ClickTV y generar credenciales NODO7 con formato `nombretv123` y contraseña alfanumérica de 8 caracteres.

**Architecture:** El adaptador ClickTV seguirá aislado en `lib/demo/providers/clicktv.ts`. Las credenciales se derivarán de la clave de idempotencia existente para que tengan apariencia aleatoria pero sean estables durante reintentos; el proveedor solo aceptará respuestas con `STATUS_SUCCESS`.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Supabase, API Xtream-Masters/ClickTV mediante formulario POST.

## Global Constraints

- Ofrecer únicamente paquetes `6` y `7`.
- Usuario: primer nombre normalizado, máximo 12 caracteres, seguido de `tv` y tres dígitos.
- Contraseña: exactamente 8 caracteres alfanuméricos sin caracteres visualmente confusos.
- No revelar API key, usuario ni contraseña en logs de verificación.
- No reintentar automáticamente una llamada real con resultado ambiguo.
- La URL HTTP fue aceptada explícitamente por el usuario; todas las credenciales permanecen en variables privadas de servidor.

---

### Task 1: Credenciales deterministas y contrato de respuesta

**Files:**
- Modify: `tests/demo/clicktv-provider.test.ts`
- Modify: `lib/demo/providers/clicktv.ts`

**Interfaces:**
- Consumes: `DemoProviderInput` con `name`, `packageId` e `idempotencyKey`.
- Produces: `createClickTvDemoProvider(options): DemoProvider`, sin cambiar su firma pública.

- [ ] **Step 1: Escribir pruebas que fallen para el nuevo formato**

Actualizar el caso exitoso para que la respuesta use el contrato real:

```ts
JSON.stringify({
  status: "STATUS_SUCCESS",
  data: {
    id: 42,
    username: "mariatv872",
    password: "K7mQ4x9P",
    exp_date: 1784731200,
  },
})
```

Verificar el formulario y las credenciales generadas:

```ts
expect(url).toBe("https://provider.example/api");
expect(form.get("api_key")).toBe("private-key");
expect(form.get("action")).toBe("create_line");
expect(form.get("username")).toMatch(/^mariatv\d{3}$/);
expect(form.get("password")).toMatch(/^[A-Za-z2-9]{8}$/);
```

Agregar este ayudante y los casos de estabilidad y errores:

```ts
async function submittedCredentials(name: string, idempotencyKey: string) {
  const fetchImpl = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({
      status: "STATUS_SUCCESS",
      data: { id: 42, exp_date: 1784731200 },
    }), { status: 200 }),
  );
  const provider = createClickTvDemoProvider({
    baseUrl: "https://provider.example/api",
    apiKey: "private-key",
    fetchImpl,
  });
  await provider.createDemo({ name, packageId: 7, idempotencyKey });
  const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
  const form = new URLSearchParams(String(init.body));
  return { username: form.get("username"), password: form.get("password") };
}

it("uses the first normalized name with stable readable credentials", async () => {
  const key = "00000000-0000-4000-8000-000000000001";
  const first = await submittedCredentials("María José", key);
  const same = await submittedCredentials("María José", key);
  const different = await submittedCredentials(
    "María José",
    "00000000-0000-4000-8000-000000000002",
  );
  expect(first.username).toMatch(/^mariatv\d{3}$/);
  expect(first.password).toMatch(/^[A-Za-z2-9]{8}$/);
  expect(same).toEqual(first);
  expect(different).not.toEqual(first);
});

it.each([
  ["STATUS_FAILURE", "explicit"],
  ["STATUS_INVALID_PACKAGE", "explicit"],
  ["STATUS_EXISTS_USERNAME", "ambiguous"],
] as const)("classifies %s as %s", async (status, outcome) => {
  const provider = createClickTvDemoProvider({
    baseUrl: "https://provider.example/api",
    apiKey: "private-key",
    fetchImpl: vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status, data: {} }), { status: 200 }),
    ),
  });
  await expect(provider.createDemo({
    name: "Pedro Gómez",
    packageId: 7,
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
  })).rejects.toMatchObject({ outcome });
});
```

- [ ] **Step 2: Ejecutar la prueba y confirmar RED**

Run: `npm.cmd test -- tests/demo/clicktv-provider.test.ts`

Expected: FAIL porque el usuario comienza con `n7`, la contraseña supera 8 caracteres, `api_key/action` están en la URL y `STATUS_FAILURE` no se rechaza.

- [ ] **Step 3: Implementar el generador mínimo**

En `lib/demo/providers/clicktv.ts`:

```ts
const CREDENTIAL_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function normalizeFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const normalized = first
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  return normalized || "cliente";
}
```

Derivar sufijo y contraseña con esta implementación:

```ts
function deterministicCredentials(input: DemoProviderInput) {
  const digest = hashSecret(`provider:${input.idempotencyKey}`);
  const suffix = String(Number.parseInt(digest.slice(0, 8), 16) % 1_000)
    .padStart(3, "0");
  const password = Array.from({ length: 8 }, (_, index) => {
    const offset = 8 + index * 2;
    const byte = Number.parseInt(digest.slice(offset, offset + 2), 16);
    return CREDENTIAL_ALPHABET[byte % CREDENTIAL_ALPHABET.length];
  }).join("");
  return {
    username: `${normalizeFirstName(input.name)}tv${suffix}`,
    password,
  };
}
```

Enviar los parámetros en el cuerpo:

```ts
const form = new URLSearchParams({
  api_key: this.options.apiKey,
  action: "create_line",
  package: String(input.packageId),
  trial: "1",
  is_isplock: "0",
  username: credentials.username,
  password: credentials.password,
});
```

Clasificar el estado antes de leer `data`:

```ts
if (payload.status !== "STATUS_SUCCESS") {
  const usernameExists = payload.status === "STATUS_EXISTS_USERNAME";
  throw new DemoProviderError(
    usernameExists ? "PROVIDER_USERNAME_EXISTS" : "PROVIDER_REJECTED",
    usernameExists ? "ambiguous" : "explicit",
  );
}
if (!payload.data || typeof payload.data !== "object") {
  throw new DemoProviderError("PROVIDER_INVALID_RESPONSE", "ambiguous");
}
```

- [ ] **Step 4: Ejecutar prueba dirigida y suite completa**

Run: `npm.cmd test -- tests/demo/clicktv-provider.test.ts`

Expected: PASS.

Run: `npm.cmd run test`

Expected: 14 archivos y todas las pruebas PASS.

- [ ] **Step 5: Confirmar el cambio**

```powershell
git add tests/demo/clicktv-provider.test.ts lib/demo/providers/clicktv.ts
git commit -m "feat: generate readable NODO7 demo credentials"
```

### Task 2: Verificación de producción y demo real controlada

**Files:**
- Verify: `.env.local` (ignorado por Git)
- Verify: `lib/demo/providers/clicktv.ts`
- Verify: `supabase/migrations/0001_nodo7_demo_access.sql`

**Interfaces:**
- Consumes: `createDemoService`, `createDemoGenerator`, `getDemoProvider` y `createSupabaseDemoRepository`.
- Produces: una solicitud real registrada en Supabase con paquete `7`, sin imprimir sus credenciales.

- [ ] **Step 1: Ejecutar verificación completa**

Run: `npm.cmd run check`

Expected: pruebas, TypeScript y build de Next.js PASS.

- [ ] **Step 2: Crear una única demo real mediante el dominio de aplicación**

Ejecutar un script TypeScript de una sola vez que:

```ts
const repository = createSupabaseDemoRepository();
const service = createDemoService(repository);
const access = await service.createAdminCode();
const session = await service.activateAccessCode({
  code: access.code,
  ip: "127.0.0.1",
  now: new Date(),
});
const generator = createDemoGenerator(repository, getDemoProvider());
const result = await generator.generateDemoForSession({
  token: session.token,
  body: { name: "Prueba técnica NODO7", packageId: 7 },
  now: new Date(),
});
```

El script solo debe imprimir verificaciones booleanas de formato, paquete y vencimiento. Si la llamada termina con resultado ambiguo, detenerse y revisar el panel del proveedor; no volver a ejecutarla.

- [ ] **Step 3: Verificar persistencia sin exponer credenciales**

Consultar Supabase y comprobar que el último código está `used`, la solicitud está `ok`, `package_id = 7`, el nombre es `Prueba técnica NODO7` y la contraseña está cifrada.

- [ ] **Step 4: Publicar la implementación**

```powershell
git push origin codex/nodo7-demo-access
git push origin HEAD:main
```

Expected: ambas ramas remotas apuntan al commit de implementación y `.env.local` no aparece en Git.
