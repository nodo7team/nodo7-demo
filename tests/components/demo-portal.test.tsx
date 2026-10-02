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
  /**
   * Installing an 80 MB player takes longer than the ten minutes the code
   * allows, so the offer has to come before the clock, not after.
   */
  it("offers the app before asking for the code", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ state: "none" })),
    );
    render(<DemoPortal initialSession={{ state: "none" }} />);

    expect(screen.getByRole("heading", { name: /instala la app/i })).toBeVisible();
    expect(screen.getByText(/paso 1 de 4/i)).toBeVisible();
    expect(screen.queryByLabelText(/código de acceso/i)).not.toBeInTheDocument();
  });

  /** Whoever already burned their code has nothing to gain from that screen. */
  it("skips the app step once the clock is already running", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ state: "none" })),
    );
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
          deliveryOnly: false,
        }}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: /instala la app/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeVisible();
  });

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
    await user.click(screen.getByRole("button", { name: /ya la tengo/i }));
    await user.type(
      screen.getByLabelText(/código de acceso/i),
      "N7-ABCD-EFGH-JKLM-NPQR-STUV",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByLabelText("Nombre")).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /1 hora full/i }),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: /4 horas/i })).toBeVisible();

    // That the clock is running, not which second it reads: pinning the exact
    // value made this fail whenever the suite itself ran a little slower.
    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent(/\d\d:\d\d/);
    expect(timer).not.toHaveTextContent("--:--");
  });

  it("requires every field, a reachable phone and consent before generating", async () => {
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
          deliveryOnly: false,
        }}
      />,
    );
    const button = screen.getByRole("button", { name: /generar mi demo/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText("Nombre"), "María");
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    expect(button).toBeDisabled();

    // Too short to be a real number, so it must not unlock the button.
    await user.type(screen.getByLabelText("WhatsApp"), "123");
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText("WhatsApp"));
    await user.type(screen.getByLabelText("WhatsApp"), "3465551234");
    expect(button).toBeDisabled();

    // An address that cannot receive anything must not unlock it either.
    await user.type(screen.getByLabelText("Correo electrónico"), "maria(at)ejemplo");
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText("Correo electrónico"));
    await user.type(screen.getByLabelText("Correo electrónico"), "maria@ejemplo.com");
    expect(button).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
  });

  /**
   * The area code used to be treated as part of the calling code, so a
   * Dominican number came out as 1809 + 8095551234 and reached nobody.
   */
  it("accepts a Dominican number with its own area code", async () => {
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
          deliveryOnly: false,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox", { name: /buscar país/i }), "809");
    await user.click(
      screen.getByRole("option", { name: /república dominicana/i }),
    );
    await user.type(screen.getByLabelText("WhatsApp"), "8295551234");

    expect(await screen.findByText("+1 829 555 1234")).toBeVisible();
  });

  it("follows the number when it belongs to another +1 territory", async () => {
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
          deliveryOnly: false,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox", { name: /buscar país/i }), "809");
    await user.click(
      screen.getByRole("option", { name: /república dominicana/i }),
    );
    // A Puerto Rican area code: the picker corrects itself instead of arguing.
    await user.type(screen.getByLabelText("WhatsApp"), "7875551234");

    expect(
      await screen.findByRole("button", { name: /país: puerto rico/i }),
    ).toBeVisible();
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
              deliveryOnly: false,
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
          deliveryOnly: false,
        }}
      />,
    );
    await user.type(screen.getByLabelText("Nombre"), "María");
    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "maria@ejemplo.com",
    );
    await user.type(screen.getByLabelText("WhatsApp"), "3465551234");
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    await user.click(screen.getByRole("checkbox"));
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

  it("warns that a wrong number means no access at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ state: "none" })),
    );
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
          deliveryOnly: true,
        }}
      />,
    );

    expect(screen.getByText(/solo por whatsapp/i)).toBeVisible();
    expect(screen.getByText(/no se muestran en esta pantalla/i)).toBeVisible();
  });

  it("does not warn while the screen still shows the credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ state: "none" })),
    );
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
          deliveryOnly: false,
        }}
      />,
    );

    expect(screen.queryByText(/no se muestran en esta pantalla/i)).not.toBeInTheDocument();
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
          deliveryOnly: false,
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
          deliveryOnly: false,
        }}
      />,
    );

    await user.type(screen.getByLabelText("Nombre"), "María");
    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "maria@ejemplo.com",
    );
    await user.type(screen.getByLabelText("WhatsApp"), "(346) 555-1234");
    await user.click(screen.getByRole("radio", { name: /1 hora full/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /generar mi demo/i }));

    const call = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/demo/generate"),
    );
    expect(JSON.parse(String(call![1].body))).toEqual({
      name: "María",
      email: "maria@ejemplo.com",
      packageId: 7,
      countryIso: "US",
      phone: "(346) 555-1234",
      consent: true,
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
          deliveryOnly: false,
        }),
      ),
    );
    render(
      <DemoPortal
        initialSession={{
          state: "setup",
          deadline: "2026-07-22T12:00:01.000Z",
          remainingSeconds: 1,
          deliveryOnly: false,
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

  describe("one page per kind of access", () => {
    function stubFetch(accessResponse: Response) {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) =>
        String(input).endsWith("/api/demo/session")
          ? jsonResponse({ state: "none" })
          : accessResponse.clone(),
      );
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    async function submitCode(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: /ya la tengo instalada/i }));
      await user.type(screen.getByLabelText(/código de acceso/i), "N7-AAAA-BBBB");
      await user.click(screen.getByRole("button", { name: /continuar/i }));
    }

    it("tells the server which page the pass was entered on", async () => {
      const user = userEvent.setup();
      const fetchMock = stubFetch(
        jsonResponse({
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
        }),
      );
      render(<DemoPortal initialSession={{ state: "none" }} kind="activecode" />);

      await submitCode(user);

      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/api/demo/access"),
      )!;
      expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({
        code: "N7-AAAA-BBBB",
        page: "activecode",
      });
    });

    it("defaults to the username and password page", async () => {
      const user = userEvent.setup();
      const fetchMock = stubFetch(
        jsonResponse({
          state: "setup",
          deadline: new Date(Date.now() + 600_000).toISOString(),
          remainingSeconds: 600,
        }),
      );
      render(<DemoPortal initialSession={{ state: "none" }} />);

      await submitCode(user);

      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/api/demo/access"),
      )!;
      expect(JSON.parse(String((call[1] as RequestInit).body)).page).toBe("line");
    });

    it("says on the page itself which kind of access it hands out", () => {
      stubFetch(jsonResponse({ state: "none" }));
      const { unmount } = render(
        <DemoPortal initialSession={{ state: "none" }} kind="activecode" />,
      );
      expect(screen.getByText(/pase de prueba · código de activación/i)).toBeVisible();
      unmount();

      render(<DemoPortal initialSession={{ state: "none" }} kind="line" />);
      expect(screen.getByText(/pase de prueba · usuario y contraseña/i)).toBeVisible();
    });

    it("links a visitor holding the other kind of pass to the right page", async () => {
      const user = userEvent.setup();
      stubFetch(
        jsonResponse(
          {
            error: "Este pase es para otra página. Te llevamos a la correcta.",
            redirectTo: "/demo/activecode",
          },
          409,
        ),
      );
      render(<DemoPortal initialSession={{ state: "none" }} kind="line" />);

      await submitCode(user);

      expect(
        await screen.findByRole("link", { name: /ir a la página correcta/i }),
      ).toHaveAttribute("href", "/demo/activecode");
    });
  });
});
