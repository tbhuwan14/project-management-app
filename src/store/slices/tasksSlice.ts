import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '../../types';

export const tasksAdapter = createEntityAdapter<Task>({
  sortComparer: (a, b) => a.position - b.position,
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: tasksAdapter.getInitialState(),
  reducers: {
    taskUpserted: tasksAdapter.upsertOne,
    taskPatched(state, action: PayloadAction<{ id: string; changes: Partial<Task> }>) {
      tasksAdapter.updateOne(state, action.payload);
    },
    tasksPatched(state, action: PayloadAction<Array<{ id: string; changes: Partial<Task> }>>) {
      tasksAdapter.updateMany(state, action.payload);
    },
  },
});

export const { taskUpserted, taskPatched, tasksPatched } = tasksSlice.actions;
export default tasksSlice.reducer;
