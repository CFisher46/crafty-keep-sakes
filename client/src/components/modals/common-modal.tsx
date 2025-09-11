import { Layer, Box } from "grommet";
import UserManagement from "../../features/admin_tools/userManagement/page";
import ProductManagement from "../../features/admin_tools/productManagement/page";
import CustomReports from "../../features/admin_tools/customReports/page";

function CommonModal({
  title,
  onClose,
  type
}: {
  title: string;
  onClose: () => void;
  type: string;
}) {
  return (
    <Layer onEsc={onClose} onClickOutside={onClose}>
      <Box
        pad="medium"
        gap="medium"
        width="large"
        height={{ min: "medium", max: "large" }}
        overflow="auto"
      >
        <Box>
          {type === "user" && <UserManagement title={title} />}
          {type === "product" && <ProductManagement title={title} />}
          {type === "reports" && <CustomReports title={title} />}
        </Box>
      </Box>
    </Layer>
  );
}

export default CommonModal;
