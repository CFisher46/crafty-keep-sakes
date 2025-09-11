import { Text, Form, Box, TextInput, Grid, Button } from "grommet";
import { View, Hide } from "grommet-icons";
import { useEffect, useState } from "react";
import { fetchUserById } from "../../store/users/usersThunks";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
//import { useDispatch } from "react-redux";
import { useAppDispatch } from "../../store/hooks";
import { useParams } from "react-router-dom";

//import { buttonStyles } from '../../helpers/styles';

interface InputFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  onChange: (value: string) => void;
  type?: string;
  toggleVisibility?: () => void;
  isPassword?: boolean;
  isVisible?: boolean;
}

const InputField = ({
  label,
  value,
  placeholder,
  inputStyle,
  labelStyle,
  onChange,
  type = "text",
  toggleVisibility,
  isPassword = false,
  isVisible = false
}: InputFieldProps) => (
  <Box direction="row" gap="small" align="center">
    <Text style={labelStyle}>{label}</Text>
    <TextInput
      style={inputStyle}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      type={type}
    />
    {isPassword && toggleVisibility && (
      <Button
        icon={isVisible ? <Hide /> : <View />}
        onClick={toggleVisibility}
      />
    )}
  </Box>
);

function UsersProfile() {
  const { id: userId } = useParams<{ id: string }>(); // Extract userId from URL
  const dispatch = useAppDispatch();
  const selectedUser = useSelector(
    (state: RootState) => state.users.selectedUser
  );

  const [userData, setUserData] = useState({
    id: "",
    email_address: "",
    first_name: "",
    last_name: "",
    address_line1: "",
    address_line2: "",
    address_line3: "",
    town: "",
    county: "",
    postcode: "",
    telephone_number: "",
    type: "",
    new_password: "",
    confirm_new_password: ""
  });

  const [currentPassword, setCurrentPassword] = useState("");
  //Removed setPasswordError for linting
  const [passwordError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputStyle = { width: "100%" };
  const labelStyle = { width: "100%", textAlign: "left" as "left" };

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserById(userId));
    } else {
      console.error("User ID is undefined");
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (selectedUser) {
      setUserData((prev) => ({
        ...prev,
        ...selectedUser
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const handleFieldChange = (field: string, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Form>
      <Grid columns={["450px", "400px", "420px"]} gap="small">
        <Box border round="small" pad="medium" gap="small" background="white">
          {[
            { label: "UserName", field: "email_address" },
            { label: "FirstName", field: "first_name" },
            { label: "LastName", field: "last_name" },
            { label: "Address Line1", field: "address_line1" },
            { label: "Address Line2", field: "address_line2" },
            { label: "Address Line3", field: "address_line3" },
            { label: "Town", field: "town" },
            { label: "County", field: "county" },
            { label: "PostCode", field: "postcode" }
          ].map(({ label, field }) => (
            <InputField
              key={label}
              label={label}
              placeholder={userData[field as keyof typeof userData] || ""}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              onChange={(value) => handleFieldChange(field, value)}
              value={userData[field as keyof typeof userData] || ""}
            />
          ))}
        </Box>
        <Box border round="small" pad="medium" gap="small" background="white">
          <Text style={labelStyle}>My Invoices</Text>
          <TextInput style={inputStyle} />
        </Box>
        <Box direction="column" gap="small">
          <Box border round="small" pad="medium" gap="small" background="white">
            <Text style={labelStyle}>Reset Password</Text>
            <InputField
              label="Current Password"
              value={currentPassword}
              placeholder="Enter current password"
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              onChange={setCurrentPassword}
              type="password"
            />
            <Button
              label="Verify Password"
              // Add password verification logic here
            />
            {passwordError && (
              <Text color="status-critical">{passwordError}</Text>
            )}
            <InputField
              label="New Password"
              value={userData.new_password || ""}
              placeholder="Enter new password"
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              onChange={(value) => handleFieldChange("new_password", value)}
              type={showNewPassword ? "text" : "password"}
              isPassword
              toggleVisibility={() => setShowNewPassword((prev) => !prev)}
              isVisible={showNewPassword}
            />
            <InputField
              label="Confirm Password"
              value={userData.confirm_new_password || ""}
              placeholder="Confirm new password"
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              onChange={(value) =>
                handleFieldChange("confirm_new_password", value)
              }
              type={showConfirmPassword ? "text" : "password"}
              isPassword
              toggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
              isVisible={showConfirmPassword}
            />
          </Box>
          <Box border round="small" pad="medium" gap="small" background="white">
            <Text style={labelStyle}>Action buttons?</Text>
          </Box>
        </Box>
      </Grid>
    </Form>
  );
}

export default UsersProfile;
