import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { Grant } from '../../types';

export const grantsAdapter = createEntityAdapter<Grant>();

const grantsSlice = createSlice({
  name: 'grants',
  initialState: grantsAdapter.getInitialState(),
  reducers: {
    grantUpserted: grantsAdapter.upsertOne,
  },
});

export const { grantUpserted } = grantsSlice.actions;
export default grantsSlice.reducer;
