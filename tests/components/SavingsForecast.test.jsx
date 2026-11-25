// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SavingsForecast from "@/components/Goals/SavingsForecast";
import { forecastView, savingsForecast } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";

describe("SavingsForecast", () => {
  it("points to the Finances page when there's nothing to forecast", () => {
    render(<SavingsForecast forecast={null} />);
    expect(screen.getByRole("link", { name: "Finances page" })).toHaveAttribute("href", "/budget");
  });

  it("flags a monthly shortfall in words, not only as a negative number", () => {
    const spending = { amount: 700, basis: "limits" };
    const forecast = forecastView({
      forecast: savingsForecast({ income: 2000, bills: 1500, spending }),
      income: 2000,
      bills: 1500,
      spending,
      goalsNeeded: null,
      currency: "EUR",
    });
    render(<SavingsForecast forecast={forecast} />);
    expect(screen.getByText(formatMoney(-200))).toBeInTheDocument();
    expect(screen.getByText("More goes out than comes in")).toBeInTheDocument();
    expect(screen.getByText(formatMoney(-2400))).toBeInTheDocument();
    expect(screen.getByText("No active goals with a target date")).toBeInTheDocument();
    expect(screen.getByText(/category limits stand in for spending/)).toBeInTheDocument();
  });
});
