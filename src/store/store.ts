import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type { PermissionEntities } from '../lib/permissions';
import containersReducer, { containersAdapter } from './slices/containersSlice';
import grantsReducer, { grantsAdapter } from './slices/grantsSlice';
import sessionReducer from './slices/sessionSlice';
import statusesReducer, { statusesAdapter } from './slices/statusesSlice';
import tasksReducer, { tasksAdapter } from './slices/tasksSlice';
import uiReducer from './slices/uiSlice';
import usersReducer, { usersAdapter } from './slices/usersSlice';
import { seedContainers, seedGrants, seedStatuses, seedTasks, seedUsers } from './seed';

const rootReducer = combineReducers({
  containers: containersReducer,
  tasks: tasksReducer,
  statuses: statusesReducer,
  users: usersReducer,
  grants: grantsReducer,
  session: sessionReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type PreloadedAppState = Partial<RootState>;

export function seedState(): PreloadedAppState {
  return {
    containers: containersAdapter.setAll(containersAdapter.getInitialState(), seedContainers),
    tasks: tasksAdapter.setAll(tasksAdapter.getInitialState(), seedTasks),
    statuses: statusesAdapter.setAll(statusesAdapter.getInitialState(), seedStatuses),
    users: usersAdapter.setAll(usersAdapter.getInitialState(), seedUsers),
    grants: grantsAdapter.setAll(grantsAdapter.getInitialState(), seedGrants),
  };
}

export function makeStore(preloaded?: PreloadedAppState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded ?? seedState(),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

export const containersSelectors = containersAdapter.getSelectors<RootState>((s) => s.containers);
export const tasksSelectors = tasksAdapter.getSelectors<RootState>((s) => s.tasks);
export const statusesSelectors = statusesAdapter.getSelectors<RootState>((s) => s.statuses);
export const usersSelectors = usersAdapter.getSelectors<RootState>((s) => s.users);
export const grantsSelectors = grantsAdapter.getSelectors<RootState>((s) => s.grants);

export const permissionEntities = (state: RootState): PermissionEntities => ({
  containers: state.containers.entities,
  users: state.users.entities,
  grants: grantsSelectors.selectAll(state),
});
