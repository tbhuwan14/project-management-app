import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Container } from '../../types';

export const containersAdapter = createEntityAdapter<Container>({
  sortComparer: (a, b) => a.position - b.position,
});

const containersSlice = createSlice({
  name: 'containers',
  initialState: containersAdapter.getInitialState(),
  reducers: {
    containerUpserted: containersAdapter.upsertOne,
    containerPatched(state, action: PayloadAction<{ id: string; changes: Partial<Container> }>) {
      containersAdapter.updateOne(state, action.payload);
    },
  },
});

export const { containerUpserted, containerPatched } = containersSlice.actions;
export default containersSlice.reducer;
