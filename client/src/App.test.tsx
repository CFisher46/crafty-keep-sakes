import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders User List heading", () => {
  render(<App />);
  const headingElement = screen.getByText(/User List/i);
  expect(headingElement).toBeInTheDocument();
});
