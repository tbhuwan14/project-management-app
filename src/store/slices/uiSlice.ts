import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  message: string;
  tone: 'error' | 'success';
}
export interface ListSort {
  key: 'dueDate' | 'priority';
  dir: 'asc' | 'desc';
}
export interface UiState {
  booted: boolean;
  selectedListId: string | null;
  viewMode: 'board' | 'list';
  drawerTaskId: string | null;
  toasts: Toast[];
  listSort: ListSort | null;
}

const initialState: UiState = {
  booted: false,
  selectedListId: null,
  viewMode: 'board',
  drawerTaskId: null,
  toasts: [],
  listSort: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    markBooted(state) { state.booted = true; },
    selectList(state, action: PayloadAction<string | null>) {
      state.selectedListId = action.payload;
      state.drawerTaskId = null;
    },
    setViewMode(state, action: PayloadAction<'board' | 'list'>) { state.viewMode = action.payload; },
    openDrawer(state, action: PayloadAction<string>) { state.drawerTaskId = action.payload; },
    closeDrawer(state) { state.drawerTaskId = null; },
    setListSort(state, action: PayloadAction<ListSort | null>) { state.listSort = action.payload; },
    addToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(input: { message: string; tone: Toast['tone'] }) {
        return { payload: { id: nanoid(), ...input } };
      },
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  markBooted, selectList, setViewMode, openDrawer, closeDrawer, setListSort, addToast, removeToast,
} = uiSlice.actions;
export default uiSlice.reducer;
