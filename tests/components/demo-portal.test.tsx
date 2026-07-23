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

  it("requires a name and one package before generating", async () => {
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
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    const button = screen.getByRole("button", { name: /generar mi demo/i });
    await user.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/generando/i);

    resolveGeneration(
      jsonResponse({
        username: "demo-user",
        password: "demo-pass",
        packageId: 7,
        packageName: "1 hora FULL",
        expiresAt: null,
      }),
    );
    expect(await screen.findByText("demo-user")).toBeVisible();
    expect(screen.getByText("demo-pass")).toBeVisible();
  });

  it("restores a completed result after reload", () => {
    const result: DemoSessionView = {
      state: "result",
      deadline: new Date(Date.now() + 300_000).toISOString(),
      remainingSeconds: 300,
      result: {
        username: "restored-user",
        password: "restored-pass",
        packageId: 6,
        packageName: "4 horas",
        expiresAt: null,
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(result)));
    render(<DemoPortal initialSession={result} />);
    expect(screen.getByText("restored-user")).toBeVisible();
    expect(screen.getByText("restored-pass")).toBeVisible();
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
