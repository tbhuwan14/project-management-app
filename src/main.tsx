import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.css';
import App from './App';
import { loadPersisted, subscribePersistence } from './store/persistence';
import { markBooted } from './store/slices/uiSlice';
import { makeStore } from './store/store';

const persisted = loadPersisted();
let store;
if (persisted) {
  const { containers, tasks, statuses, users, grants, session } = persisted;
  store = makeStore({ containers, tasks, statuses, users, grants, session });
} else {
  store = makeStore();
}
subscribePersistence(store);
setTimeout(() => store.dispatch(markBooted()), 400); // simulated initial fetch → skeletons

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
