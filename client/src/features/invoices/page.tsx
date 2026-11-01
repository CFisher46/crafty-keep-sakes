import { useEffect } from 'react';
import { Box, Text } from 'grommet';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUserById } from '../../store/users/usersThunks';
import { ui } from '../../helpers/theme';
import Invoices from './invoices';

export default function MyInvoicesPage() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const selectedUser = useAppSelector((state) => state.users.selectedUser);

  useEffect(() => {
    if (userId) dispatch(fetchUserById(userId));
  }, [dispatch, userId]);

  return (
    <Box gap="medium" pad="xsmall">
      <Box gap="xxsmall">
        <Text style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.muted }}>
          Account
        </Text>
        <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
          My invoices
        </Text>
      </Box>
      <Invoices scope="mine" billingAddress={selectedUser ?? undefined} />
    </Box>
  );
}
