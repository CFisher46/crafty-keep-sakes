import { Box, Text, Button, Select, TextInput, Card, Grid } from "grommet";
import { fetchAllUsers, fetchUserById } from "../../../store/users/usersThunks";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import { User } from "../../../types";
import { buttonStyles } from "../../../helpers/formatting";

const UserManagement = ({ title }: { title: string }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [updateUser, setUpdateUser] = useState<User | null>(null);
  const [createUser, setCreateUser] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await dispatch(fetchAllUsers());
      setUsers(result.payload as User[]);
    };
    fetchUsers();
  }, [dispatch]);

  const handleFetchUser = async () => {
    if (!selectedUser) return;
    const result = await dispatch(fetchUserById(selectedUser.id));
    setUpdateUser(result.payload as User);
  };

  return (
    <Box pad="small" gap="small">
      <Text textAlign="center" weight="bold" size="medium">
        {title}
      </Text>

      <Box direction="row" gap="small" align="center" justify="center">
        <Select
          options={users}
          labelKey="id"
          valueKey={{ key: "id", reduce: true }}
          value={selectedUser?.id || "Select a User"}
          placeholder="Select a User"
          onChange={({ option }) => setSelectedUser(option)}
          size="small"
        />

        <Button
          size="small"
          label="Find User"
          onClick={() => {
            handleFetchUser();
            setCreateUser(false);
          }}
          style={buttonStyles.default}
          disabled={!selectedUser}
        />
        <Button
          size="small"
          label="Create User"
          onClick={() => {
            setCreateUser(true);
            setUpdateUser(null);
            setSelectedUser(undefined);
          }}
          style={buttonStyles.default}
        />
      </Box>

      {updateUser && (
        <Card
          pad="small"
          background="light-2"
          elevation="small"
          overflow="auto"
        >
          <Grid
            columns={["1/2", "1/2"]}
            gap="small"
            pad="small"
            style={{ maxHeight: "850px", overflowY: "auto" }}
          >
            {Object.entries(updateUser)
              .filter(
                ([key]) =>
                  key !== "password" && key !== "invoice_id" && key !== "id"
              )
              .map(([key, value], index) => (
                <Box key={index} direction="column" gap="xsmall">
                  <Text
                    size="small"
                    weight="bold"
                    style={{ textTransform: "capitalize" }}
                  >
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                    :
                  </Text>
                  <TextInput
                    placeholder={String(value)}
                    size="small"
                    style={{ fontSize: "12px" }}
                  />
                </Box>
              ))}
          </Grid>
        </Card>
      )}
      {createUser && <Box>Create User Form Placeholder</Box>}
    </Box>
  );
};

export default UserManagement;
