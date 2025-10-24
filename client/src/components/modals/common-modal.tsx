import { Layer, Box } from 'grommet';
import ProductModal from '../../features/products/view-details/page';

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
        height={{ min: 'medium', max: 'large' }}
        overflow="auto"
      >
        <Box>
          {type === 'viewProducts' && (
            <ProductModal title={title} values={values} />
          )}
        </Box>
      </Box>
    </Layer>
  );
}

export default CommonModal;
