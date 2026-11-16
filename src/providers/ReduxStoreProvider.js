"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";

export default function ReduxStoreProvider({ currentUser, children }) {
  // Created once per mount, so each visitor gets their own store.
  const [store] = useState(() => makeStore({ currentUser }));
  return <Provider store={store}>{children}</Provider>;
}
