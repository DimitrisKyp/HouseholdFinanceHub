import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  projectName: "Tabula Rasa",
  tagline: "A teacher-focused learning blog",
};

const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    updateTagline: (state, action) => {
      state.tagline = action.payload;
    },
  },
});

export const { updateTagline } = siteSlice.actions;
export default siteSlice.reducer;
