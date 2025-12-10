import { User } from "../../types";

export interface UsersState {
  list: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
}
