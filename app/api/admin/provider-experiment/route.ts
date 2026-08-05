import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Temporary experiment: finds which parameters make create_activecode leave
 * exp_date null, which is what a code created by hand in the panel looks like
 * and what the app needs in order to activate.
 *
 * It creates real activation codes — four of them, on a trial package that
 * costs no credits. Admin session required. Delete once the answer is known.
 */
const PACKAGE_ID = "7";

interface Variant {
  label: string;
  fields: Record<string, string>;
  arrays?: Record<string, string[]>;
}

const VARIANTS: Variant[] = [
  {
    label: "1 · sin trial",
    fields: {},
  },
  {
    label: "2 · trial=0 con bouquets explicitos",
    fields: { trial: "0" },
    arrays: {
      "bouquets_selected[]": [
        "4", "88", "87", "51", "47", "66", "7", "45", "72", "5", "58", "44",
        "86", "8", "9", "10", "11", "12", "13", "15", "16", "17", "19", "20",
        "21", "22", "23", "25", "26", "27", "28", "29", "61", "31", "32",
        "33", "34", "35", "2", "3",
      ],
    },
  },
  {
    label: "3 · trial=0 con allowed_ips vacio",
    fields: { trial: "0" },
    arrays: { "allowed_ips[]": [] },
  },
  {
    label: "4 · solo package y code",
    fields: {},
  },
];

function experimentCode(index: number): string {
  // Recognisable in the panel so these are easy to find and delete.
  return `99${String(Date.now()).slice(-6)}${String(index)}${String(index)}`;
}

async function runExperiment(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Opening a URL must never create anything by accident, so the intent is
  // spelled out in the query string.
  if (request.nextUrl.searchParams.get("confirm") !== "crear") {
    return NextResponse.json(
      {
        error: "Este endpoint crea códigos reales.",
        como: "Agrega ?confirm=crear a la URL para ejecutarlo.",
        creara: VARIANTS.map((variant) => variant.label),
      },
      { status: 400 },
    );
  }

  const baseUrl = process.env.DEMO_PROVIDER_BASE_URL;
  const apiKey = process.env.DEMO_PROVIDER_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "Proveedor sin configurar." }, { status: 503 });
  }

  const results = [];
  for (const [index, variant] of VARIANTS.entries()) {
    const code = experimentCode(index + 1);
    const form = new URLSearchParams({
      api_key: apiKey,
      action: "create_activecode",
      package: PACKAGE_ID,
      code,
      reseller_notes: `EXPERIMENTO ${variant.label}`,
      ...variant.fields,
    });
    for (const [key, values] of Object.entries(variant.arrays ?? {})) {
      if (values.length === 0) form.append(key, "");
      for (const value of values) form.append(key, value);
    }

    try {
      const response = await fetch(new URL(baseUrl).toString(), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      results.push({
        variant: variant.label,
        code,
        enviado: [...form.keys()].filter((key) => key !== "api_key"),
        status: payload?.status ?? `http ${response.status}`,
        id: payload?.data?.id ?? null,
        exp_date: payload?.data?.exp_date ?? "(no viene en la respuesta)",
      });
    } catch (error) {
      results.push({
        variant: variant.label,
        code,
        error: error instanceof Error ? error.message : "desconocido",
      });
    }
  }

  return NextResponse.json({
    nota: "Revisa get_activecodes: el que tenga exp_date null es el correcto.",
    results,
  });
}

export async function GET(request: NextRequest) {
  return runExperiment(request);
}

export async function POST(request: NextRequest) {
  return runExperiment(request);
}
