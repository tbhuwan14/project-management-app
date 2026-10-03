import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Status } from '../../types';

export const statusesAdapter = createEntityAdapter<Status>({
  sortComparer: (a, b) => a.position - b.position,
});

const statusesSlice = createSlice({
  name: 'statuses',
  initialState: statusesAdapter.getInitialState(),
  reducers: {
    statusUpserted: statusesAdapter.upsertOne,
    statusPatched(state, action: PayloadAction<{ id: string; changes: Partial<Status> }>) {
      statusesAdapter.updateOne(state, action.payload);
    },
  },
});

export const { statusUpserted, statusPatched } = statusesSlice.actions;
export default statusesSlice.reducer;
