import { render, screen } from "@testing-library/react";
import MainBody from "./mainBody";

let mockCurrentPath = "/";

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");
    const MockNavigate = ({ to }: { to: string }) => {
      mockCurrentPath = to;
      return null;
    };

    const matchesPath = (currentPath: string, routePath: string) => {
      if (routePath.includes(":")) {
        const staticPrefix = routePath.split(":")[0];
        return currentPath.startsWith(staticPrefix);
      }

      return currentPath === routePath;
    };

    const resolveRoute = (
      currentPath: string,
      children: React.ReactNode
    ): React.ReactNode => {
      let matchedElement: React.ReactNode = null;

      React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child) || matchedElement) {
          return;
        }

        if (matchesPath(currentPath, child.props.path)) {
          matchedElement = child.props.element;
        }
      });

      if (React.isValidElement(matchedElement) && matchedElement.type === MockNavigate) {
        mockCurrentPath = matchedElement.props.to;
        return resolveRoute(mockCurrentPath, children);
      }

      return matchedElement;
    };

    return {
      __esModule: true,
      Navigate: MockNavigate,
      Route: () => null,
      Routes: ({ children }: { children: React.ReactNode }) => (
        <>{resolveRoute(mockCurrentPath, children)}</>
      ),
      useLocation: () => ({ pathname: mockCurrentPath })
    };
  },
  { virtual: true }
);

jest.mock("../../features/landingPage/page", () => () => (
  <div>Landing Page</div>
));

jest.mock("../../features/products/page", () => () => <div>Shop Page</div>);

jest.mock("../../features/basket/page", () => () => (
  <div>Basket Page</div>
));

jest.mock("../../features/profile/page", () => () => (
  <div>Profile Page</div>
));

jest.mock("../../features/admin_tools/page", () => () => (
  <div>Admin Page</div>
));

jest.mock("../../components/login/login", () => () => <div>Login Page</div>);

jest.mock("../../helpers/protectedRoutes", () => ({
  __esModule: true,
  default: ({
    element,
    requiredTypes
  }: {
    element: JSX.Element;
    requiredTypes: string[];
  }) => (
    <div
      data-testid="protected-route"
      data-required-types={requiredTypes.join(",")}
    >
      {element}
    </div>
  )
}));

describe("MainBody routes", () => {
  it("redirects the root route to the landing page", async () => {
    mockCurrentPath = "/";

    render(<MainBody />);

    expect(await screen.findByText("Landing Page")).toBeInTheDocument();
  });

  it("renders the shop route", () => {
    mockCurrentPath = "/Shop";

    render(<MainBody />);

    expect(screen.getByText("Shop Page")).toBeInTheDocument();
  });

  it("wraps the profile route in the protected route with customer access", () => {
    mockCurrentPath = "/profile/user-1";

    render(<MainBody />);

    expect(screen.getByText("Profile Page")).toBeInTheDocument();
    expect(screen.getByTestId("protected-route")).toHaveAttribute(
      "data-required-types",
      "customer,admin,Customer"
    );
  });

  it("renders the login route", () => {
    mockCurrentPath = "/Login";

    render(<MainBody />);

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});