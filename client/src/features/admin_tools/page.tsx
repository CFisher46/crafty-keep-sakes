import { Box, Button, Text, Tab, Tabs } from "grommet";
import CommonModal from "../../components/modals/common-modal";
import { AuditLogs } from "./audits/page";
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
  const handleClose = () => {
    setUserManagementModal(false);
    setProductShowModal(false);
    setReportsShowModal(false);
  };

  return (
    <Box pad={{ horizontal: "1px" }}>
      <Tabs>
        <Tab title="Admin Tools">
          <Box
            direction="row"
            justify="evenly"
            background={"white"}
            pad="medium"
            round="small"
          >
            <Button label="User Management" onClick={handleUserManagement} />
            {showUserManagementModal && (
              <CommonModal
                title="Create / Update / Delete Users."
                onClose={handleClose}
                type="user"
              />
            )}
            <Button
              label="Product Management"
              onClick={handleProductManagement}
            />
            {showProductModal && (
              <CommonModal
                title="Product Management"
                onClose={handleClose}
                type="product"
              />
            )}
            <Button label="Reports" onClick={handleGenerateReports} />
            {showReportsModal && (
              <CommonModal
                title="Custom Reports"
                onClose={handleClose}
                type="reports"
              />
            )}
          </Box>
          <Box height="20px" />
          <Box background={"white"} pad="medium" round="small">
            <Text>Reports Section</Text>
          </Box>
        </Tab>
        <Tab title="Audit Logs">
          <AuditLogs />
        </Tab>
      </Tabs>
    </Box>
  );
}

export default AdminTools;
