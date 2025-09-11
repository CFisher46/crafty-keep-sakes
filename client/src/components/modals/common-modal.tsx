import { Layer, Text, Box } from "grommet";
function CommonModal(title: any, onClose: any) {
  return (
    <Layer onEsc={onClose} onClickOutside={onClose}>
      <Box
        pad="medium"
        gap="medium"
        width="large"
        height={{ min: "medium", max: "large" }}
        overflow="auto"
      >
        <Text>{title}</Text>
      </Box>
    </Layer>
  );
}

export default CommonModal;
