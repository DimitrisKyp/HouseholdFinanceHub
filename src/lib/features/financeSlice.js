import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  monthlyIncome: 4200,
  expenses: [
    { id: 1, title: "Groceries", category: "Groceries", amount: 146, paidBy: "Alex" },
    { id: 2, title: "Electricity bill", category: "Bills", amount: 92, paidBy: "Maria" },
    { id: 3, title: "School transport", category: "Transport", amount: 68, paidBy: "Alex" },
    { id: 4, title: "Family dinner", category: "Leisure", amount: 54, paidBy: "Maria" },
  ],
  budgetCategories: [
    { name: "Groceries", limit: 650 },
    { name: "Bills", limit: 380 },
    { name: "Transport", limit: 240 },
    { name: "Leisure", limit: 180 },
  ],
  members: [
    { name: "Alex", email: "alex@home.com", role: "Owner" },
    { name: "Maria", email: "maria@home.com", role: "Editor" },
    { name: "Nikos", email: "nikos@home.com", role: "Viewer" },
  ],
  invites: ["sophia@home.com"],
  goals: [
    { name: "Emergency fund", progress: 72, note: "Save three months of household expenses." },
    { name: "School trip budget", progress: 44, note: "Reserve funds for the spring class excursion." },
    { name: "New laptop fund", progress: 61, note: "Set aside money for remote work and study." },
  ],
  marketNews: [
    {
      source: "Markets",
      title: "Tech shares rebound after inflation data cools",
      summary: "Index funds and large-cap technology names moved higher in early trading.",
    },
    {
      source: "Crypto",
      title: "Bitcoin holds above a key support level",
      summary: "The crypto market continues to react to ETF flows and macro headlines.",
    },
    {
      source: "Personal finance",
      title: "Households tighten discretionary spending",
      summary: "Budget apps are seeing more users tracking groceries, bills, and subscriptions.",
    },
  ],
};

const financeSlice = createSlice({
  name: "finance",
  initialState,
  reducers: {
    addExpense: (state, action) => {
      state.expenses.unshift({
        id: Date.now(),
        title: action.payload.title,
        category: action.payload.category,
        amount: action.payload.amount,
        paidBy: action.payload.paidBy,
      });
    },
    inviteMember: (state, action) => {
      state.invites.unshift(action.payload);
    },
  },
});

export const { addExpense, inviteMember } = financeSlice.actions;
export default financeSlice.reducer;