// Ready-to-show rows for the Finances and Spending pages. Amounts are formatted on the server, so
// the browser receives labels in the household's currency and the reader's language.

/** A recurring income or bill as a row. t: the "budget" translator; money: amount → label. */
export function recurringRow(item, t, money) {
  return {
    id: item.id,
    title: item.title,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    detail: [t(`recurring.frequencies.${item.frequency}`), item.type === "income" ? item.memberName : item.categoryName]
      .filter(Boolean)
      .join(" · "),
    amountLabel: money(item.amount),
    monthlyLabel: item.frequency === "monthly" ? null : money(item.monthlyAmount),
  };
}
