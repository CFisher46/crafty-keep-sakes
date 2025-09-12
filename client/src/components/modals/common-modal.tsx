import { Layer, Box } from "grommet";
import UserManagement from "../../features/admin_tools/userManagement/page";
import ProductManagement from "../../features/admin_tools/productManagement/page";
import CustomReports from "../../features/admin_tools/customReports/page";
import ProductModal from "../../features/products/view-details/page";

function CommonModal({
  title,
  onClose,
  type,
  values,
}: {
  title: string;
  onClose: () => void;
  type: string;
  values?: any;
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
          {type === "viewProducts" && <ProductModal values={values} />}
        </Box>
      </Box>
    </Layer>
  );
}

export default CommonModal;
