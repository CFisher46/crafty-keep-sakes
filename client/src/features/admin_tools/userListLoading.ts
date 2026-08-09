export const shouldLoadUsersForSelection = (
  requestedAction: string,
  requestedTool: string,
  userCount: number
): boolean => {
  const needsUserSelection =
    requestedTool === 'User' &&
    (requestedAction === 'Update' || requestedAction === 'Delete');

  return needsUserSelection && userCount === 0;
};