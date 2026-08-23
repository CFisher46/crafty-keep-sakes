export type ApiRouteDomain = 'auth' | 'products' | 'users' | 'audit' | 'basket';
export type ApiRouteSource = 'v2';

export const DEFAULT_ROUTE_SOURCE: ApiRouteSource = 'v2';

export function getApiRouteSource(): ApiRouteSource {
  return DEFAULT_ROUTE_SOURCE;
}
