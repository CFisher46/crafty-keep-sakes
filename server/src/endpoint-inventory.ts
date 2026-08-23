export type EndpointRole = 'public' | 'authenticated' | 'admin';
export type EndpointSource = 'canonical' | 'v2';

export type EndpointInventoryItem = {
  domain: 'auth' | 'products' | 'users' | 'audit' | 'basket';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  role: EndpointRole;
  source: EndpointSource;
  notes: string;
};

export const ACTIVE_ENDPOINTS: Record<
  'auth' | 'products' | 'users' | 'audit' | 'basket',
  {
    public: EndpointInventoryItem[];
    authenticated: EndpointInventoryItem[];
    admin: EndpointInventoryItem[];
  }
> = {
  auth: {
    public: [
      {
        domain: 'auth',
        method: 'POST',
        path: '/api/auth/login',
        role: 'public',
        source: 'canonical',
        notes: 'Login using the selected auth source',
      },
    ],
    authenticated: [
      {
        domain: 'auth',
        method: 'GET',
        path: '/api/auth/me',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Current session identity lookup',
      },
      {
        domain: 'auth',
        method: 'POST',
        path: '/api/auth/logout',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Clear the auth cookie',
      },
    ],
    admin: [],
  },
  products: {
    public: [
      {
        domain: 'products',
        method: 'GET',
        path: '/api/products',
        role: 'public',
        source: 'canonical',
        notes: 'List live products',
      },
      {
        domain: 'products',
        method: 'GET',
        path: '/api/products/filter',
        role: 'public',
        source: 'canonical',
        notes: 'Apply filter/sort combinations',
      },
      {
        domain: 'products',
        method: 'GET',
        path: '/api/products/:id',
        role: 'public',
        source: 'canonical',
        notes: 'Fetch a single product by id or sku',
      },
    ],
    authenticated: [],
    admin: [
      {
        domain: 'products',
        method: 'POST',
        path: '/api/products',
        role: 'admin',
        source: 'canonical',
        notes: 'Create a product',
      },
      {
        domain: 'products',
        method: 'PUT',
        path: '/api/products/:id',
        role: 'admin',
        source: 'canonical',
        notes: 'Update mutable product fields',
      },
      {
        domain: 'products',
        method: 'POST',
        path: '/api/products/:id/images/upload',
        role: 'admin',
        source: 'canonical',
        notes: 'Upload product images',
      },
    ],
  },
  users: {
    public: [],
    authenticated: [
      {
        domain: 'users',
        method: 'GET',
        path: '/api/users/:id',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Self or admin user detail lookup',
      },
      {
        domain: 'users',
        method: 'PUT',
        path: '/api/users/:id',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Self-update or admin update',
      },
    ],
    admin: [
      {
        domain: 'users',
        method: 'GET',
        path: '/api/users',
        role: 'admin',
        source: 'canonical',
        notes: 'List users for admin',
      },
      {
        domain: 'users',
        method: 'POST',
        path: '/api/users',
        role: 'admin',
        source: 'canonical',
        notes: 'Create a new user',
      },
      {
        domain: 'users',
        method: 'DELETE',
        path: '/api/users/:id',
        role: 'admin',
        source: 'canonical',
        notes: 'Delete a user',
      },
    ],
  },
  audit: {
    public: [],
    authenticated: [],
    admin: [
      {
        domain: 'audit',
        method: 'GET',
        path: '/api/audit',
        role: 'admin',
        source: 'canonical',
        notes: 'Read filtered, paginated audit rows',
      },
    ],
  },
  basket: {
    public: [],
    authenticated: [
      {
        domain: 'basket',
        method: 'GET',
        path: '/api/basket',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Current basket overview',
      },
      {
        domain: 'basket',
        method: 'GET',
        path: '/api/basket/orders',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Orders for the signed-in customer',
      },
      {
        domain: 'basket',
        method: 'GET',
        path: '/api/basket/orders/:id',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Order detail with ownership checks',
      },
      {
        domain: 'basket',
        method: 'GET',
        path: '/api/basket/invoices/:id',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Invoice detail with ownership checks',
      },
      {
        domain: 'basket',
        method: 'POST',
        path: '/api/basket/items',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Add an item to the active basket',
      },
      {
        domain: 'basket',
        method: 'PUT',
        path: '/api/basket/items/:productId',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Update basket quantity',
      },
      {
        domain: 'basket',
        method: 'DELETE',
        path: '/api/basket/items/:productId',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Remove basket item',
      },
      {
        domain: 'basket',
        method: 'POST',
        path: '/api/basket/checkout',
        role: 'authenticated',
        source: 'canonical',
        notes: 'Create order, invoice, and clean basket state',
      },
    ],
    admin: [
      {
        domain: 'basket',
        method: 'PUT',
        path: '/api/basket/invoices/:id',
        role: 'admin',
        source: 'canonical',
        notes: 'Update invoice status and sync linked order',
      },
    ],
  },
};

export const ENDPOINT_INVENTORY: EndpointInventoryItem[] = Object.values(ACTIVE_ENDPOINTS)
  .flatMap((group) => [...group.public, ...group.authenticated, ...group.admin]);

export const V2_ENDPOINT_INVENTORY = ENDPOINT_INVENTORY.filter(
  ({ path }) => path.startsWith('/api/v2/') || path.startsWith('/api/')
).map((endpoint) => ({
  ...endpoint,
  path: endpoint.path.replace('/api/', '/api/v2/'),
  source: 'v2' as const,
}));
