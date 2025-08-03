export interface User {
  id: string;
  email_address: string;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  town: string;
  county: string;
  postcode: string;
  telephone_number: string;
  type: string;
  status: string;
  invoice_id: number;
  password: string;
}

export interface UsersState {
  list: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
}
