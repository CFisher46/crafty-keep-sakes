import React, { useState, useEffect } from 'react';
import { Box, Select, Text } from 'grommet';
import { AuditLogs } from './audits/page';
import CreateNewUser from './userManagement/createUser';
import UpdateUser from './userManagement/updateUser';
import { User } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { fetchAllUsers, fetchUserById } from '../../store/users/usersThunks';
import DeleteExisitingUser from './userManagement/deleteUser';
import CreateNewProduct from './productManagement/createProduct';
import UpdateProduct from './productManagement/updateProdct';
import { ui } from '../../helpers/theme';

type Area = 'Users' | 'Products' | 'Reports' | 'Audit log';
type Action = 'Add' | 'Update' | 'Delete';

const areaActions: Record<Area, Action[]> = {
  Users: ['Add', 'Update', 'Delete'],
  Products: ['Add', 'Update'],
  Reports: ['Add', 'Update', 'Delete'],
  'Audit log': [],
};

const areas = Object.keys(areaActions) as Area[];

const labelStyle = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${active ? ui.ink : 'transparent'}`,
        padding: '10px 4px',
        marginRight: '24px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: active ? 700 : 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: active ? ui.ink : ui.muted,
      }}
    >
      {label}
    </button>
  );
}

function Segment({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: '8px 20px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        border: `1px solid ${ui.ink}`,
        marginLeft: '-1px',
        background: active ? ui.ink : '#fff',
        color: active ? '#fff' : ui.ink,
      }}
    >
      {label}
    </button>
  );
}

const panelStyle = {
  background: '#fff',
  border: `1px solid ${ui.line}`,
  borderRadius: '2px',
};

function AdminTools() {
  const [area, setArea] = useState<Area>('Users');
  const [action, setAction] = useState<Action>('Update');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [fetchedUser, setFetchedUser] = useState<User | undefined>();
  const dispatch = useAppDispatch();

  const needsUser = area === 'Users' && (action === 'Update' || action === 'Delete');

  useEffect(() => {
    if (!needsUser || users.length > 0) return;
    const loadUsers = async () => {
      const result = await dispatch(fetchAllUsers());
      setUsers((result.payload as User[]) ?? []);
    };
    loadUsers();
  }, [dispatch, needsUser, users.length]);

  const chooseArea = (next: Area) => {
    setArea(next);
    setSelectedUser(undefined);
    setFetchedUser(undefined);
    const options = areaActions[next];
    if (!options.includes(action)) setAction(options[0] ?? 'Add');
  };

  const chooseAction = (next: Action) => {
    setAction(next);
    setSelectedUser(undefined);
    setFetchedUser(undefined);
  };

  const chooseUser = async (user: User) => {
    setSelectedUser(user);
    setFetchedUser(undefined);
    const result = await dispatch(fetchUserById(user.id));
    setFetchedUser(result.payload as User);
  };

  const renderTool = () => {
    if (area === 'Users') {
      if (action === 'Add') return <CreateNewUser />;
      if (!fetchedUser) return null;
      return action === 'Update' ? (
        <UpdateUser key={fetchedUser.id} {...fetchedUser} />
      ) : (
        <DeleteExisitingUser key={fetchedUser.id} {...fetchedUser} />
      );
    }
    if (area === 'Products') {
      return action === 'Add' ? <CreateNewProduct /> : <UpdateProduct />;
    }
    return (
      <Box pad="medium">
        <Text color={ui.muted}>Reports are coming soon.</Text>
      </Box>
    );
  };

  const tool = area === 'Audit log' ? null : renderTool();

  return (
    <Box gap="medium" pad="xsmall">
      <Box gap="xxsmall">
        <Text style={labelStyle}>Admin</Text>
        <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
          Admin tools
        </Text>
      </Box>

      <div role="tablist" aria-label="Admin areas" style={{ borderBottom: `1px solid ${ui.line}`, display: 'flex', flexWrap: 'wrap' }}>
        {areas.map((name) => (
          <Tab key={name} label={name} active={area === name} onClick={() => chooseArea(name)} />
        ))}
      </div>

      {area === 'Audit log' ? (
        <AuditLogs defaultOpen />
      ) : (
        <>
          <Box direction="row" gap="medium" align="center" wrap>
            <Box direction="row" role="group" aria-label="Action" style={{ paddingLeft: '1px' }}>
              {areaActions[area].map((name) => (
                <Segment key={name} label={name} active={action === name} onClick={() => chooseAction(name)} />
              ))}
            </Box>
            {needsUser && (
              <Box direction="row" gap="small" align="center">
                <Text style={labelStyle}>{`Select a user to ${action.toLowerCase()}`}</Text>
                <Box width="medium">
                  <Select
                    options={users}
                    labelKey={(option) =>
                      `${option.last_name}, ${option.first_name} (${option.email_address})`
                    }
                    value={selectedUser}
                    placeholder="Select a User"
                    onChange={({ option }) => chooseUser(option)}
                    size="small"
                  />
                </Box>
              </Box>
            )}
          </Box>

          {tool && (
            <Box pad="small" style={panelStyle}>
              {tool}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default AdminTools;
