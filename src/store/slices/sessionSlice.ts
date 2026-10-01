import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SessionState {
  currentUserId: string;
  simulateFailures: boolean;
}

const initialState: SessionState = { currentUserId: 'u-alice', simulateFailures: false };

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<string>) {
      state.currentUserId = action.payload;
    },
    setSimulateFailures(state, action: PayloadAction<boolean>) {
      state.simulateFailures = action.payload;
    },
  },
});

export const { setCurrentUser, setSimulateFailures } = sessionSlice.actions;
export default sessionSlice.reducer;
