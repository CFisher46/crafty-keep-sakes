import { Box, Button, Tab, Tabs } from "grommet";
import { Notes, SettingsOption } from "grommet-icons";
import CommonModal from "../../components/modals/common-modal";
import { AuditLogs } from "./audits/page";
import { Reports } from "./reports/page";
import { buttonStyles } from "../../helpers/formatting";
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
    <Box
      pad={{ horizontal: "1px" }}
      round="small"
      gap="small"
      background="white"
      elevation="small"
    >
      <Tabs>
        <Tab title="Admin Tools" icon={<SettingsOption />}>
          <Box
            direction="row"
            justify="evenly"
            background={"white"}
            pad="medium"
            round="small"
          >
            <Button
              label="User Management"
              onClick={handleUserManagement}
              style={buttonStyles.default}
            />
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
              style={buttonStyles.default}
            />
            {showProductModal && (
              <CommonModal
                title="Product Management"
                onClose={handleClose}
                type="product"
              />
            )}
            <Button
              label="Reports"
              onClick={handleGenerateReports}
              style={buttonStyles.default}
            />
            {showReportsModal && (
              <CommonModal
                title="Custom Reports"
                onClose={handleClose}
                type="reports"
              />
            )}
          </Box>
          <Box height="20px" />
          <Reports />
        </Tab>
        <Tab title="Audit Logs" icon={<Notes />}>
          <AuditLogs />
        </Tab>
      </Tabs>
    </Box>
  );
}

export default AdminTools;
