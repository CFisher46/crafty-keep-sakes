import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import { Review } from "../../types";
import {RootState} from "../../store";
import { resetCreateStatus } from "../products/productsSlice";

const initialState: Review = {
  id: "",
  star_count: 0,
  source: "",
  comment: "",
  submit_date: new Date(),
};

const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    resetCreateStatus: (state) => {
        state.createStatus = "idle";
        state.error = null;
    }
  },
});
export default reviewsSlice.reducer;