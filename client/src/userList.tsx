import React, { useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
}

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

  return (
    <div>
      <h2>User List</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.id}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
