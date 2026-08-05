import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Read-only window into the demo provider, for the admin only.
 *
 * The panel is unreachable from a developer machine but reachable from the
 * deployment, so this is the only way to see what it actually stored. It never
 * creates, edits or deletes anything, and never returns the API key.
 */
const ALLOWED_ACTIONS = new Set([
  "packages",
  "user_info",
  "get_activecode",
  "get_activecodes",
  "get_line",
]);

export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action") ?? "packages";
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: `Acción no permitida. Usa: ${[...ALLOWED_ACTIONS].join(", ")}` },
      { status: 400 },
    );
  }

  const baseUrl = process.env.DEMO_PROVIDER_BASE_URL;
  const apiKey = process.env.DEMO_PROVIDER_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "El proveedor no está configurado." },
      { status: 503 },
    );
  }

  const url = new URL(baseUrl);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("action", action);
  for (const key of ["id", "start", "limit"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    const raw = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { unparsed: raw.slice(0, 500) };
    }
    return NextResponse.json({ action, httpStatus: response.status, payload });
  } catch (error) {
    return NextResponse.json(
      {
        action,
        error: "No se pudo contactar al proveedor.",
        detail: error instanceof Error ? error.message : "desconocido",
      },
      { status: 502 },
    );
  }
}
