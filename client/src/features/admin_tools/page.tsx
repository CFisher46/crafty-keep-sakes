import { Box, Button, Text } from "grommet";
import CommonModal from "../../components/modals/common-modal";
import React from "react";

function AdminTools() {
  const [showProductModal, setProductShowModal] = React.useState(false);
  const [showReportsModal, setReportsShowModal] = React.useState(false);
  const [showUserManagementModal, setUserManagementModal] =
    React.useState(false);

  const handleProductManagement = () => {
    setProductShowModal(true);
  };

  const handleGenerateReports = () => {
    setReportsShowModal(true);
  };
  const handleUserManagement = () => {
    setUserManagementModal(true);
  };
  return (
    <Box pad={{ horizontal: "1px" }}>
      <Box
        direction="row"
        justify="evenly"
        background={"white"}
        pad="medium"
        round="small"
      >
        <Button label="User Management" onClick={handleUserManagement} />
        {showUserManagementModal &&
          CommonModal("User Management", () => setUserManagementModal(false))}
        <Button label="Product Management" onClick={handleProductManagement} />
        {showProductModal &&
          CommonModal("Product Management", () => setProductShowModal(false))}
        <Button label="Generate Reports" onClick={handleGenerateReports} />
        {showReportsModal &&
          CommonModal("Reports Management", () => setReportsShowModal(false))}
      </Box>
      <Box margin={{ top: "medium" }} />
      <Box background={"white"} pad="medium" round="small">
        <Text>Reports Section</Text>
      </Box>
    </Box>
  );
}

export default AdminTools;
