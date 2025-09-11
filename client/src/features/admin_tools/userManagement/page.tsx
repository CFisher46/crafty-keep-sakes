import { Box, Text, Button, Select, TextInput, Card, Grid } from "grommet";
import { fetchAllUsers, fetchUserById } from "../../../store/users/usersThunks";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import { User } from "../../../store/users/types";

const UserManagement = ({ title }: { title: string }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [chosenUser, setChosenUser] = useState<User | null>(null);
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
    setChosenUser(result.payload as User);
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
          value={selectedUser}
          placeholder="Select a User"
          onChange={({ option }) => setSelectedUser(option)}
          size="small"
        />
        <Button size="small" label="Fetch User" onClick={handleFetchUser} />
      </Box>

      {chosenUser && (
        <Card
          pad="small"
          background="light-1"
          elevation="small"
          overflow="auto"
        >
          <Grid
            columns={["1/4", "3/4"]}
            gap="xsmall"
            pad={{ vertical: "xsmall" }}
            style={{ maxHeight: "300px", overflowY: "auto" }}
          >
            {Object.entries(chosenUser)
              .filter(([key]) => key !== "password" && key !== "invoice_id")
              .map(([key, value]) => (
                <>
                  <Text
                    key={`${key}-label`}
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
                    key={`${key}-input`}
                    placeholder={String(value)}
                    size="small"
                    style={{ fontSize: "12px" }}
                  />
                </>
              ))}
          </Grid>
        </Card>
      )}
    </Box>
  );
};

export default UserManagement;
