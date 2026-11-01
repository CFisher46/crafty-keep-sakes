import { render, screen, fireEvent } from '@testing-library/react';
import ReportingPage from './page';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

describe('ReportingPage', () => {
  it('links admins to the unrestricted invoices page', () => {
    render(<ReportingPage />);

    expect(screen.getByRole('heading', { name: 'Reporting' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View all invoices' }));

    expect(mockNavigate).toHaveBeenCalledWith('/Reporting/invoices');
  });
});
