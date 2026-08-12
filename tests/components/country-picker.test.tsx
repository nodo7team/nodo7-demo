import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CountryPicker } from "@/components/demo/CountryPicker";

function setup(value = "US") {
  const onChange = vi.fn();
  render(<CountryPicker value={value} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe("country picker", () => {
  it("shows the selected country and its calling code", () => {
    setup("DO");
    const trigger = screen.getByRole("button", {
      name: /país: república dominicana/i,
    });
    expect(within(trigger).getByText("+1")).toBeVisible();
  });

  it("stays closed until it is asked for", async () => {
    setup();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await screen.findByRole("button", { name: /país/i });
  });

  it("filters by name without needing the accents", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox"), "mexico");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("México");
  });

  /**
   * Someone from Santo Domingo thinks of 809 as their country code. The picker
   * has to answer that even though the calling code is +1.
   */
  it("finds a territory by the area code its people quote", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox"), "809");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("República Dominicana");
    expect(options[0]).toHaveTextContent("+1");
  });

  it("reports the chosen country and closes", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox"), "puerto");
    await user.click(screen.getByRole("option", { name: /puerto rico/i }));

    expect(onChange).toHaveBeenCalledWith("PR");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("can be driven from the keyboard alone", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox"), "jam");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("JM");
  });

  it("closes on Escape without choosing anything", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says so instead of showing an empty list", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    await user.type(screen.getByRole("textbox"), "zzzzz");

    expect(screen.getByText(/ningún país coincide/i)).toBeVisible();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers every country, not a shortlist", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /país/i }));
    expect(screen.getAllByRole("option").length).toBeGreaterThan(240);
  });
});
