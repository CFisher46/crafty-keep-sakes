import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers, PreloadedState } from '@reduxjs/toolkit';
import productsReducer from '../store/products/productsSlice';
import basketReducer from '../store/basket/basketSlice';
import usersReducer from '../store/users/usersSlice';
import authReducer from '../store/auth/authSlice';
import auditReducer from '../store/audits/auditSlice';

// Mirrors the app's real reducer map (store/index.ts) so tests exercise the
// same slice shapes without redefining combineReducers in every test file.
const rootReducer = combineReducers({
  products: productsReducer,
  basket: basketReducer,
  users: usersReducer,
  auth: authReducer,
  audit: auditReducer,
});

export type TestRootState = ReturnType<typeof rootReducer>;

export function buildTestStore(preloadedState?: PreloadedState<TestRootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export function renderWithProviders(
  ui: ReactElement,
  { preloadedState }: { preloadedState?: PreloadedState<TestRootState> } = {}
) {
  const store = buildTestStore(preloadedState);

  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}
