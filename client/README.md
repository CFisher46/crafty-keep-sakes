# Crafty Keepsakes – Client

React + TypeScript front-end for the Crafty Keepsakes e-commerce platform. Built with Create React App, Redux Toolkit, Grommet UI, and React Router.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Runs the app in development mode at [http://localhost:3000](http://localhost:3000). Hot-reloads on file changes. |
| `npm test` | Launches the Jest test runner in interactive watch mode. |
| `npm run build` | Compiles a production-optimised build into the `build/` folder. |
| `npm run eject` | Ejects the CRA configuration (one-way — cannot be undone). |

---

## Project Structure

```
src/
├── App.tsx
├── index.tsx
├── types.ts
├── react-app-env.d.ts
├── setupTests.ts
├── reportWebVitals.ts
├── components/
│   ├── buttons/
│   ├── footer/
│   ├── header/
│   ├── login/
│   ├── mainContainer/
│   └── modals/
├── features/
│   ├── admin_tools/
│   ├── basket/
│   ├── landingPage/
│   ├── products/
│   └── profile/
├── helpers/
├── store/
│   ├── audits/
│   ├── auth/
│   ├── basket/
│   ├── products/
│   └── users/
└── test_integrations/
```

---

## Root Files

| File | Description |
|------|-------------|
| `index.tsx` | Application entry point. Mounts the React app into the DOM wrapped with the Redux `Provider` and `BrowserRouter`. |
| `App.tsx` | Root React component. Composes the top-level page layout by rendering `Header`, `MainBody`, and `Footer`. |
| `types.ts` | Global TypeScript type definitions shared across the entire app. Declares the `User`, `Product`, and `Audit` data shapes. |
| `react-app-env.d.ts` | CRA TypeScript environment reference. Provides type support for Create React App toolchain globals. |
| `setupTests.ts` | Jest test setup. Imports `@testing-library/jest-dom` to extend Jest with DOM-specific custom matchers. |
| `reportWebVitals.ts` | Web Vitals performance reporting utility. Optionally measures and reports CLS, FID, FCP, LCP, and TTFB metrics. |

---

## `components/`

Shared, reusable UI components used across multiple features.

### `buttons/`

| File | Description |
|------|-------------|
| `cksButtons.tsx` | `CksButton` — a reusable Grommet `Button` wrapper with consistent CKS brand styling. Accepts `label`, `onClick`, `status` (controls disabled state), `type`, `name`, and an optional custom `style`. |

### `footer/`

| File | Description |
|------|-------------|
| `footer.tsx` | Page footer. Renders social media icon links (Instagram, Facebook, Twitter) displayed at the bottom of every page. |

### `header/`

| File | Description |
|------|-------------|
| `header.tsx` | Main page header. Displays the site logo, `SearchBar`, `NavigationBar`, and user/basket icon buttons. Shows the current basket item count. |
| `nav.tsx` | Navigation bar. Renders role-aware navigation buttons (Shop, Admin, etc.) using React Router. Highlights the active route and conditionally shows admin-only links based on the logged-in user's type. |
| `searchBar.tsx` | Live search input. Fetches matching products and blog results from the API as the user types and displays them in a dropdown overlay. |
| `types.ts` | TypeScript interface for `NavigationBarProps` — used by `nav.tsx` to type its props (including the `resetActive` imperative handle). |

### `login/`

| File | Description |
|------|-------------|
| `login.tsx` | Login form component. Collects email and password, submits credentials to `POST /api/auth/login`, and dispatches `loginSuccess` on a successful response. |
| `types.ts` | Placeholder file reserved for login-specific TypeScript type definitions. |

### `mainContainer/`

| File | Description |
|------|-------------|
| `mainBody.tsx` | Central routing container. Defines all client-side `<Routes>` and maps URL paths to feature page components. Applies `ProtectedRoute` to guard restricted pages (profile, admin). |

### `modals/`

| File | Description |
|------|-------------|
| `common-modal.tsx` | Generic modal wrapper. Renders a Grommet `Layer` overlay and delegates inner content to feature-specific components based on a `type` prop (e.g. `"viewProducts"` renders `ProductModal`). |

---

## `features/`

Self-contained page-level feature modules. Each folder corresponds to a route or admin sub-section.

### `admin_tools/`

Admin-only section at `/Admin`. Contains tabbed sub-pages for audits, custom reports, product management, reports, and user management.

| File | Description |
|------|-------------|
| `page.tsx` | Admin dashboard container. Renders the top-level admin layout with tab navigation between audit, product, user management, and reports sub-pages. |

#### `admin_tools/audits/`

| File | Description |
|------|-------------|
| `page.tsx` | Audit log viewer. Fetches all audit entries from the store and displays them in a Grommet `DataTable`. Column headers are auto-generated from the data keys (with `user` aliased to `id` in the display). |
| `types.ts` | TypeScript types for the audit tools sub-feature. |

#### `admin_tools/customReports/`

| File | Description |
|------|-------------|
| `page.tsx` | Custom reports page. Placeholder page for admin-defined custom report views. |

#### `admin_tools/productManagement/`

| File | Description |
|------|-------------|
| `createProduct.tsx` | Create product form. Collects all product fields (name, category, description, price, quantity, on-sale status, sale percentage, is-live, images). Uses `rawInputValues` state to handle boolean field display without immediate coercion. On submit, dispatches `createProduct` then `uploadProductImages`. Shows a success confirmation modal on completion that resets the form. |
| `updateProdct.tsx` | Update product form. Renders a `Select` dropdown to choose an existing product, pre-populates the form with its current values, and dispatches `updateProduct` (passing both the edited values and the previous product for field-level diff auditing). |

#### `admin_tools/reports/`

| File | Description |
|------|-------------|
| `page.tsx` | Reports overview page. Placeholder page for standard admin reports. |

#### `admin_tools/userManagement/`

| File | Description |
|------|-------------|
| `createUser.tsx` | Create user form. Collects all user fields and dispatches `createUser` thunk to add a new user record. |
| `deleteUser.tsx` | Delete user form. Allows an admin to select and remove a user record by dispatching `deleteUser` thunk. |
| `updateUser.tsx` | Update user form. Pre-populates fields for a selected user and dispatches `updateUser` thunk with changed values and the previous user snapshot for audit diff. |

### `basket/`

| File | Description |
|------|-------------|
| `page.tsx` | Shopping basket page. Displays all items currently in the basket (sourced from Redux / localStorage), allows quantity adjustment, and shows the running total. |

### `landingPage/`

| File | Description |
|------|-------------|
| `page.tsx` | Home / landing page. Checks auth on mount, loads all products, filters for on-sale items, and renders them in an auto-scrolling carousel. Shows a login panel for unauthenticated visitors. |
| `types.ts` | Placeholder file reserved for landing page TypeScript type definitions. |

### `products/`

| File | Description |
|------|-------------|
| `page.tsx` | Shop page. Reads filter parameters from the URL query string, fetches matching products via `fetchFilteredProducts`, displays them as a card grid, and opens a detail modal on selection. Supports adding items directly to the basket. |

#### `products/view-details/`

| File | Description |
|------|-------------|
| `page.tsx` | Product detail modal content. Renders a full product view with an image carousel (Grommet `Carousel`), product name, description, price, and category. Used inside `CommonModal`. |

### `profile/`

| File | Description |
|------|-------------|
| `page.tsx` | User profile page. Extracts the user ID from the URL param (`/profile/:id`), fetches the corresponding user from the store, and renders their details in an editable form with a password visibility toggle. |

---

## `helpers/`

Shared utility modules used across components and features.

| File | Description |
|------|-------------|
| `formatting.ts` | UI style constants. Exports `buttonStyles` (default and activeButtons) — reusable Grommet inline style objects applied to buttons throughout the app. |
| `protectedRoutes.tsx` | `ProtectedRoute` component. Guards a route by checking Redux auth state and user type; redirects unauthenticated or unauthorised users to `/home`. |
| `userAuth.tsx` | `useAuth` custom hook. Calls `GET /api/auth/me` on mount and dispatches `loginSuccess` or `logout` to keep Redux auth state in sync with the active server session. |

---

## `store/`

Redux Toolkit store. Each sub-folder is a feature slice with its own state, thunks, and selectors.

### Root

| File | Description |
|------|-------------|
| `index.ts` | Store configuration. Uses `configureStore` to combine all slice reducers (products, basket, users, auth, audit) and exports `RootState` and `AppDispatch` types. |
| `hooks.tsx` | Typed Redux hooks. Exports `useAppDispatch` and `useAppSelector` pre-typed to `AppDispatch` and `RootState` for type-safe usage across the app. |

### `store/audits/`

| File | Description |
|------|-------------|
| `auditSlice.ts` | Audit Redux slice. Manages `AuditState` (logs array, loading, error). Handles lifecycle cases for `fetchAuditLogs` and `createAuditEntry` async thunks. |
| `auditThunks.ts` | Audit async thunks. `fetchAuditLogs` — fetches all audit log records from the API. `createAuditEntry` — posts a new audit entry (user, field_changed, action_type, api_source, changed_by). Used by user and product thunks to record mutations. |
| `auditSelectors.ts` | Audit selectors. Exports `selectAuditLogs`, `selectAuditLoading`, and `selectAuditError` for reading audit state from the store. |

### `store/auth/`

| File | Description |
|------|-------------|
| `authSlice.ts` | Auth Redux slice. Manages `AuthState` (isLoggedIn, user). Provides `loginSuccess`, `logout`, `setLoggedIn`, and `resetState` reducers. |
| `authThunks.ts` | Auth async thunks. `checkAuth` — verifies the active session via `GET /api/auth/me` and dispatches loginSuccess. `performLogout` — calls `POST /api/auth/logout` and dispatches logout + state reset. |

### `store/basket/`

| File | Description |
|------|-------------|
| `basketSlice.ts` | Basket Redux slice. Manages an in-memory + localStorage-persisted list of basket items. Provides `addItemToBasket`, `removeItemFromBasket`, and `clearBasket` reducers. Initialises from localStorage on startup. |

### `store/products/`

| File | Description |
|------|-------------|
| `productsSlice.ts` | Products Redux slice. Manages `ProductsState` (list, selectedProduct, loading, error, createStatus). Handles all product async action lifecycles. |
| `productsThunks.ts` | Products async thunks. `fetchAllProducts`, `fetchProductById`, `fetchFilteredProducts` — read operations. `createProduct` — POST new product, then dispatches an audit entry (`product_created`). `updateProduct` — PUT updated product, then dispatches one audit entry per changed field using a diff against `previousProduct`. |
| `productSelectors.ts` | Products selectors. Exports selectors for list, selectedProduct, loading, error, createStatus, and a `selectProductById` lookup selector. |
| `types.ts` | `ProductsState` interface definition used by `productsSlice.ts`. |

### `store/users/`

| File | Description |
|------|-------------|
| `usersSlice.ts` | Users Redux slice. Manages `UsersState` (list, selectedUser, loading, error, isLoggedIn). Handles lifecycle cases for all user thunks and resets on auth logout. |
| `usersThunks.ts` | Users async thunks. `fetchAllUsers`, `fetchUserById` — read operations (PII is decrypted server-side). `createUser`, `updateUser` (with per-field audit diff), `deleteUser` — write operations, each dispatching appropriate audit entries. |
| `userSelectors.ts` | Users selectors. Exports `selectAllUsers`, `selectSelectedUser`, `selectUserLoading`, and `selectUserError`. |
| `types.ts` | `UsersState` interface definition used by `usersSlice.ts`. |

---

## `test_integrations/`

Integration test files for API-connected features.

| Folder | Description |
|--------|-------------|
| `features/products/` | Integration tests covering product fetch, create, and update flows against the API. |
| `features/users/` | Integration tests covering user fetch, create, update, and delete flows against the API. |

---

## Environment Variables

Create a `.env` file in the `client/` directory with the following:

```
REACT_APP_API_URL=http://localhost:3001
```
