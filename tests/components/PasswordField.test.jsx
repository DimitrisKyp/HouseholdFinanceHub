// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PasswordField from "@/components/ui/PasswordField";

describe("PasswordField", () => {
  it("shows and hides the password with the eye button", async () => {
    const user = userEvent.setup();
    render(<PasswordField id="password" label="Password" />);
    const input = screen.getByLabelText("Password", { exact: true });
    const toggle = screen.getByRole("button", { name: "Show password" });

    await user.type(input, "secret-123");
    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("secret-123");
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle);
    expect(input).toHaveAttribute("type", "password");
  });

  it("hides the password again when the form is sent", async () => {
    const user = userEvent.setup();
    render(
      <form onSubmit={event => event.preventDefault()}>
        <PasswordField id="password" label="Password" />
        <button type="submit">Send</button>
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "password");
  });
});
