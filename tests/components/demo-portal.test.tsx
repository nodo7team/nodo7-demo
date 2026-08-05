import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoPortal } from "@/components/demo/DemoPortal";
import type { DemoSessionView } from "@/lib/demo/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NODO7 demo portal", () => {
  it("moves from a one-use code to the timed setup form", async () => {
    const deadline = new Date(Date.now() + 600_000).toISOString();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/demo/session")) {
          return jsonResponse({ state: "none" });
        }
        return jsonResponse({ state: "setup", deadline, remainingSeconds: 600 });
      }),
    );
    const user = userEvent.setup();
    render(<DemoPortal initialSession={{ state: "none" }} />);

    expect(screen.queryByText(/10:00/)).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/código de acceso/i),
      "N7-ABCD-EFGH-JKLM-NPQR-STUV",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByLabelText(/nombre/i)).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /1 hora full/i }),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: /4 horas/i })).toBeVisible();
    expect(screen.getByText(/10:00|09:59/)).toBeVisible();
  });

  it("requires a name, a reachable phone and one package before generating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ state: "setup" })),
    );
    const user = userEvent.setup();
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
        }}
      />,
    );
    const button = screen.getByRole("button", { name: /generar mi demo/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/nombre/i), "María");
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    expect(button).toBeDisabled();

    // Too short to be a real number, so it must not unlock the button.
    await user.type(screen.getByLabelText(/whatsapp/i), "123");
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText(/whatsapp/i));
    await user.type(screen.getByLabelText(/whatsapp/i), "3465551234");
    expect(button).toBeEnabled();
  });

  it("submits once, disables generation, and shows credentials", async () => {
    let resolveGeneration!: (response: Response) => void;
    const generation = new Promise<Response>((resolve) => {
      resolveGeneration = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/demo/session")) {
          return Promise.resolve(
            jsonResponse({
              state: "setup",
              deadline: new Date(Date.now() + 600_000).toISOString(),
              remainingSeconds: 600,
            }),
          );
        }
        return generation;
      }),
    );
    const user = userEvent.setup();
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
        }}
      />,
    );
    await user.type(screen.getByLabelText(/nombre/i), "María");
    await user.type(screen.getByLabelText(/whatsapp/i), "3465551234");
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    const button = screen.getByRole("button", { name: /generar mi demo/i });
    await user.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/generando/i);

    resolveGeneration(
      jsonResponse({
        kind: "line",
        username: "demo-user",
        password: "demo-pass",
        packageId: 7,
        packageName: "1 hora FULL",
        expiresAt: null,
        delivery: { status: "failed", maskedPhone: "+1 346…1234" },
      }),
    );
    expect(await screen.findByText("demo-user")).toBeVisible();
    expect(screen.getByText("demo-pass")).toBeVisible();
  });

  it("sends the country and the typed number when generating", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/demo/generate")) {
        return Promise.resolve(
          jsonResponse({
            kind: "line",
            username: "demo-user",
            password: "demo-pass",
            packageId: 7,
            packageName: "1 hora FULL",
            expiresAt: null,
            delivery: { status: "sent", maskedPhone: "+1 346…1234" },
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
        }}
      />,
    );

    await user.type(screen.getByLabelText(/nombre/i), "María");
    await user.type(screen.getByLabelText(/whatsapp/i), "(346) 555-1234");
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    await user.click(screen.getByRole("button", { name: /generar mi demo/i }));

    const call = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/demo/generate"),
    );
    expect(JSON.parse(String(call![1].body))).toEqual({
      name: "María",
      packageId: 7,
      countryIso: "US",
      phone: "(346) 555-1234",
    });
    expect(await screen.findByText(/te lo enviamos/i)).toBeVisible();
  });

  it("hides the credentials when they were only delivered by WhatsApp", () => {
    const result: DemoSessionView = {
      state: "result",
      deadline: new Date(Date.now() + 300_000).toISOString(),
      remainingSeconds: 300,
      result: {
        kind: "delivered",
        packageId: 7,
        packageName: "1 hora FULL",
        expiresAt: null,
        delivery: { status: "sent", maskedPhone: "+1 346…1234" },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(result)));
    render(<DemoPortal initialSession={result} />);

    expect(screen.getByText(/\+1 346…1234/)).toBeVisible();
    expect(screen.queryByText(/^usuario$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^contraseña$/i)).not.toBeInTheDocument();
  });

  it("warns that the message did not go through when delivery failed", () => {
    const result: DemoSessionView = {
      state: "result",
      deadline: new Date(Date.now() + 300_000).toISOString(),
      remainingSeconds: 300,
      result: {
        kind: "line",
        username: "demo-user",
        password: "demo-pass",
        packageId: 7,
        packageName: "1 hora FULL",
        expiresAt: null,
        delivery: { status: "failed", maskedPhone: "+1 346…1234" },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(result)));
    render(<DemoPortal initialSession={result} />);

    expect(screen.getByText(/no pudimos enviarte/i)).toBeVisible();
    expect(screen.getByText("demo-user")).toBeVisible();
  });

  it("restores a completed result after reload", () => {
    const result: DemoSessionView = {
      state: "result",
      deadline: new Date(Date.now() + 300_000).toISOString(),
      remainingSeconds: 300,
      result: {
        kind: "line",
        username: "restored-user",
        password: "restored-pass",
        packageId: 6,
        packageName: "4 horas",
        expiresAt: null,
        delivery: { status: "failed", maskedPhone: "+1 346…1234" },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(result)));
    render(<DemoPortal initialSession={result} />);
    expect(screen.getByText("restored-user")).toBeVisible();
    expect(screen.getByText("restored-pass")).toBeVisible();
  });

  it("shows the activation code alone, with no credential fields", () => {
    const result: DemoSessionView = {
      state: "result",
      deadline: new Date(Date.now() + 300_000).toISOString(),
      remainingSeconds: 300,
      result: {
        kind: "activecode",
        code: "N7ABCD2345",
        packageId: 7,
        packageName: "1 hora FULL",
        expiresAt: null,
        delivery: { status: "failed", maskedPhone: "+1 346…1234" },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(result)));
    render(<DemoPortal initialSession={result} />);

    expect(screen.getByText("N7ABCD2345")).toBeVisible();
    expect(screen.getByText(/código de activación/i)).toBeVisible();
    expect(screen.queryByText(/^usuario$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^contraseña$/i)).not.toBeInTheDocument();
  });

  it("expires at 00:00 without extending the server deadline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T12:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          state: "setup",
          deadline: "2026-07-22T12:00:01.000Z",
          remainingSeconds: 1,
        }),
      ),
    );
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: "2026-07-22T12:00:01.000Z",
          remainingSeconds: 1,
        }}
      />,
    );
    expect(screen.getByText("00:01")).toBeVisible();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: /sesión finalizada/i }),
    ).toBeVisible();
    expect(screen.getByText("00:00")).toBeVisible();
  });
});
