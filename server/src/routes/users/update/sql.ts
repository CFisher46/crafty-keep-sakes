import { User } from "../types";

export function updateUserQuery(user: User, id: string) {
  return {
    sql: `
        UPDATE users
        SET email = ?, first_name = ?, last_name = ?, address_line1 = ?, address_line2 = ?, address_line3 = ?, town = ?, county = ?, postcode = ?, telephone_number = ?, type = ?, status = ?, invoice_id = ?, password = ?
        WHERE id = ?
    `,
    values: [
      user.email,
      user.first_name,
      user.last_name,
      user.address_line1,
      user.address_line2,
      user.address_line3,
      user.town,
      user.county,
      user.postcode,
      user.telephone_number,
      user.type,
      user.status,
      user.invoice_id,
      user.password,
      id
    ]
  };
}
