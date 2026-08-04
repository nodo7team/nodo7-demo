import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminConsole } from "@/components/admin/AdminConsole";
import type { AdminCodeView } from "@/lib/demo/admin-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function code(
  status: AdminCodeView["status"],
  credentialType: AdminCodeView["credentialType"] = "line",
): AdminCodeView {
  return {
    id: `${status}-1`,
    displaySuffix: "ABCD",
    credentialType,
    status,
    generationAttemptCount: 1,
    activationIp: null,
    activatedAt: null,
    sessionDeadline: null,
    usedAt: null,
    revokedAt: null,
    createdAt: "2026-07-22T12:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
    request: null,
  };
}

describe("NODO7 admin console", () => {
  it("shows all lifecycle filters and copies a newly created code", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            code: "N7-ABCD-EFGH-JKLM-NPQR-STUV",
            record: code("pending"),
          },
          201,
        ),
      ),
    );
    render(<AdminConsole initialCodes={[]} />);

    for (const label of ["Todos", "Pendientes", "Activos", "Usados", "Vencidos", "Revocados"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
    await user.click(screen.getByRole("button", { name: /crear código/i }));
    expect(await screen.findByText("N7-ABCD-EFGH-JKLM-NPQR-STUV")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /copiar código/i }));
    expect(writeText).toHaveBeenCalledWith("N7-ABCD-EFGH-JKLM-NPQR-STUV");
  });

  it("issues an activation pass when the admin picks that type", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          code: "N7-ABCD-EFGH-JKLM-NPQR-STUV",
          record: code("pending", "activecode"),
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminConsole initialCodes={[]} />);

    await user.click(
      screen.getByRole("radio", { name: /código de activación/i }),
    );
    await user.click(screen.getByRole("button", { name: /crear código/i }));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      credentialType: "activecode",
    });
    expect(
      await screen.findByText(/entrega: código de activación/i),
    ).toBeVisible();
  });

  it("labels what each issued code will deliver", () => {
    render(
      <AdminConsole
        initialCodes={[code("pending", "activecode"), code("active", "line")]}
      />,
    );
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Código de activación")).toBeVisible();
    expect(table.getByText("Usuario y contraseña")).toBeVisible();
  });

  it("offers replacement instead of reset for terminal codes", () => {
    render(<AdminConsole initialCodes={[code("used"), code("expired")]} />);
    expect(screen.getAllByRole("button", { name: /crear reemplazo/i })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /restablecer/i })).not.toBeInTheDocument();
  });
});
