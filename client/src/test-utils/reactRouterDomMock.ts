// Shared virtual mock for react-router-dom (v7 is ESM-only and fails to resolve under CRA/Jest).
// Usage in a test file:
//   jest.mock('react-router-dom', () => require('<relative-path-to>/test-utils/reactRouterDomMock'), { virtual: true });
// Then import the specific hook(s) you need from 'react-router-dom' and override per test with
// (useLocation as jest.Mock).mockReturnValue({ pathname: '/Shop' }) etc.
module.exports = {
  useNavigate: jest.fn(() => jest.fn()),
  useLocation: jest.fn(() => ({ pathname: '/', search: '' })),
  useParams: jest.fn(() => ({})),
  Navigate: jest.fn((_props: { to: string }) => null),
};
export{}