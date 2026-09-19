module.exports = {
  useNavigate: jest.fn(() => jest.fn()),
  useLocation: jest.fn(() => ({ pathname: '/', search: '' })),
  useParams: jest.fn(() => ({})),
  Navigate: jest.fn((_props: { to: string }) => null),
};
export{}