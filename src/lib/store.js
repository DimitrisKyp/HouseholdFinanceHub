import { configureStore } from "@reduxjs/toolkit";
import financeReducer from "@/lib/features/financeSlice";

export const store = configureStore({
  reducer: {
    finance: financeReducer,
  },
});
