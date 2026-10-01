import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import App from '../App';
import { markBooted } from '../store/slices/uiSlice';
import { makeStore, seedState, type AppStore, type PreloadedAppState } from '../store/store';

export function renderApp(preloaded?: PreloadedAppState): AppStore {
  const store = makeStore({ ...seedState(), ...preloaded });
  store.dispatch(markBooted());
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return store;
}
