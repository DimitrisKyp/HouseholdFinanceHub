import { configureStore } from "@reduxjs/toolkit";
import financeReducer, { initialState as financeInitialState } from "@/store/features/financeSlice";

// A new store per browser session (never shared between users on the server).
export const makeStore = ({ currentUser } = {}) =>
  configureStore({
    reducer: {
      finance: financeReducer,
    },
    preloadedState: currentUser ? { finance: { ...financeInitialState, currentUser } } : undefined,
  });
