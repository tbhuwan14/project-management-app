import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { User } from '../../types';

export const usersAdapter = createEntityAdapter<User>();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    userUpserted: usersAdapter.upsertOne,
  },
});

export const { userUpserted } = usersSlice.actions;
export default usersSlice.reducer;
