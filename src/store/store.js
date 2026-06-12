import { configureStore } from "@reduxjs/toolkit";
import financeReducer from "@/store/features/financeSlice";

export const store = configureStore({
  reducer: {
    finance: financeReducer,
  },
});
