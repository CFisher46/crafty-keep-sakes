import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectAllUsers,
  selectUsersLoading,
  selectUsersError
} from "../../../store/users/usersSlice";

import { fetchAllUsers } from "../../../store/users/usersThunks";

const GetAllUsers = () => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const loading = useAppSelector(selectUsersLoading);
  const error = useAppSelector(selectUsersError);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>List of ALL Users</h2>
      <table border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>id</th>
            <th>email_address</th>
            <th>first_name</th>
            <th>last_name</th>
            <th>address_line1</th>
            <th>address_line2</th>
            <th>address_line3</th>
            <th>town</th>
            <th>county</th>
            <th>postcode</th>
            <th>telephone_number</th>
            <th>type</th>
            <th>status</th>
            <th>invoice_id</th>
            <th>password</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email_address}</td>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>{user.address_line1}</td>
              <td>{user.address_line2}</td>
              <td>{user.address_line3}</td>
              <td>{user.town}</td>
              <td>{user.county}</td>
              <td>{user.postcode}</td>
              <td>{user.telephone_number}</td>
              <td>{user.type}</td>
              <td>{user.status}</td>
              <td>{user.invoice_id}</td>
              <td>{user.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GetAllUsers;
