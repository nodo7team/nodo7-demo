import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppInstall } from "@/components/demo/AppInstall";

afterEach(() => vi.restoreAllMocks());

describe("app install step", () => {
  it("starts on the phone instructions, with a direct download per player", () => {
    render(<AppInstall onContinue={() => {}} />);

    const ibo = screen.getByRole("link", { name: /descargar ibo 26/i });
    expect(ibo).toHaveAttribute(
      "href",
      "https://apps.nodo7.online/storage/apks/aZpzjaR5bcMtBfTpnzbZ.apk",
    );
    expect(
      screen.getByRole("link", { name: /descargar v3play/i }),
    ).toHaveAttribute(
      "href",
      "https://apps.nodo7.online/storage/apks/Azir0klo13FlVHzDCZcV.apk",
    );
  });

  it("says what each download will cost in data before it starts", () => {
    render(<AppInstall onContinue={() => {}} />);

    expect(screen.getByText("30,5 MB")).toBeVisible();
    expect(screen.getByText("82,6 MB")).toBeVisible();
  });

  it("points at one player so nobody has to choose blindly", () => {
    render(<AppInstall onContinue={() => {}} />);

    // Exact, because the surrounding prose uses the word too.
    const recommended = screen.getByText("Recomendada").closest("li");
    expect(within(recommended!).getByText("IBO 26")).toBeVisible();
  });

  /**
   * The step that loses people is the one Android throws in the middle: a
   * warning that the file may harm the device. Saying so up front turns an
   * abandoned install into a tap.
   */
  it("warns about the Android security prompt before it appears", () => {
    render(<AppInstall onContinue={() => {}} />);

    expect(screen.getByText(/puede dañar tu dispositivo/i)).toBeVisible();
    expect(screen.getByText(/descargar igual/i)).toBeVisible();
  });

  it("swaps the download buttons for Downloader codes on a television", async () => {
    const user = userEvent.setup();
    render(<AppInstall onContinue={() => {}} />);

    await user.click(screen.getByRole("tab", { name: /tv/i }));

    expect(screen.getByText("4616237")).toBeVisible();
    expect(screen.getByText("3162777")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /descargar ibo 26/i }),
    ).not.toBeInTheDocument();
  });

  it("explains where the developer options hide on a Fire TV", async () => {
    const user = userEvent.setup();
    render(<AppInstall onContinue={() => {}} />);

    await user.click(screen.getByRole("tab", { name: /tv/i }));

    expect(screen.getByText(/7 veces/i)).toBeVisible();
  });

  it("copies the code of the player it belongs to", async () => {
    const user = userEvent.setup();
    // After setup(), which installs a clipboard stub of its own. jsdom exposes
    // navigator.clipboard through a getter, so it takes defineProperty.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AppInstall onContinue={() => {}} />);

    await user.click(screen.getByRole("tab", { name: /tv/i }));
    await user.click(
      screen.getByRole("button", { name: /copiar el código de v3play/i }),
    );

    expect(writeText).toHaveBeenCalledWith("3162777");
  });

  it("lets anyone who already installed it move on", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(<AppInstall onContinue={onContinue} />);

    await user.click(screen.getByRole("button", { name: /ya la tengo/i }));

    expect(onContinue).toHaveBeenCalledOnce();
  });

  describe("Roku", () => {
    it("has its own tab, with the name the Roku store shows", async () => {
      const user = userEvent.setup();
      render(<AppInstall onContinue={() => {}} />);

      await user.click(screen.getByRole("tab", { name: /roku/i }));

      expect(screen.getByRole("heading", { name: "CLIENTAREA" })).toBeVisible();
      expect(screen.getByAltText(/clientarea/i)).toBeVisible();
    });

    it("does not offer an APK or a Downloader code, because Roku installs from its store", async () => {
      const user = userEvent.setup();
      render(<AppInstall onContinue={() => {}} />);

      await user.click(screen.getByRole("tab", { name: /roku/i }));

      expect(screen.queryByRole("link", { name: /descargar/i })).not.toBeInTheDocument();
      expect(screen.queryByText("4616237")).not.toBeInTheDocument();
      expect(screen.getByText(/roku channel store/i)).toBeVisible();
    });

    it("explains that the app shows a code on screen and that we need it sent to us", async () => {
      const user = userEvent.setup();
      render(<AppInstall onContinue={() => {}} />);

      await user.click(screen.getByRole("tab", { name: /roku/i }));

      expect(screen.getByText(/te muestra un código/i)).toBeVisible();
      expect(screen.getByText(/envíanoslo/i)).toBeVisible();
    });

    it("opens WhatsApp on the support number with the request already written", async () => {
      const user = userEvent.setup();
      render(<AppInstall onContinue={() => {}} />);

      await user.click(screen.getByRole("tab", { name: /roku/i }));

      const link = screen.getByRole("link", { name: /enviar mi código por whatsapp/i });
      const url = new URL(link.getAttribute("href")!);
      expect(url.origin + url.pathname).toBe("https://wa.me/12815417014");
      expect(url.searchParams.get("text")).toMatch(/clientarea/i);
      expect(url.searchParams.get("text")).toMatch(/roku/i);
    });

    it("shows the number so it can be read or typed without the link", async () => {
      const user = userEvent.setup();
      render(<AppInstall onContinue={() => {}} />);

      await user.click(screen.getByRole("tab", { name: /roku/i }));

      expect(screen.getByText("+1 281 541 7014")).toBeVisible();
    });
  });
});
