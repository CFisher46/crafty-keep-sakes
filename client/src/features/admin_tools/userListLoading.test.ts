import { shouldLoadUsersForSelection } from './userListLoading';

describe('admin user list loading', () => {
  it('only loads users when user update or delete is selected', () => {
    expect(shouldLoadUsersForSelection('', '', 0)).toBe(false);
    expect(shouldLoadUsersForSelection('Add', 'User', 0)).toBe(false);
    expect(shouldLoadUsersForSelection('Update', 'Product', 0)).toBe(false);
    expect(shouldLoadUsersForSelection('Update', 'User', 0)).toBe(true);
    expect(shouldLoadUsersForSelection('Delete', 'User', 0)).toBe(true);
    expect(shouldLoadUsersForSelection('Update', 'User', 4)).toBe(false);
  });
});