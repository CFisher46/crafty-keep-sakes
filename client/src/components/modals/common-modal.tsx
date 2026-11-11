import { Layer, Box } from 'grommet';
import ProductModal from '../../features/products/view-details/page';
import type { Product } from '../../types';

function CommonModal({
  title,
  onClose,
  type,
  values,
  onAddToBasket,
}: {
  title: string;
  onClose: () => void;
  type: string;
  values?: any;
  onAddToBasket?: (product: Product, quantity: number) => void;
}) {
  return (
    <Layer modal responsive={false} style={{ borderRadius: '2px' }} onEsc={onClose} onClickOutside={onClose}>
      <Box width={{ max: '960px', width: '90vw' }} height={{ max: '90vh' }} overflow="auto">
        {type === 'viewProducts' && (
          <ProductModal
            title={title}
            values={values}
            onClose={onClose}
            onAddToBasket={onAddToBasket}
          />
        )}
      </Box>
    </Layer>
  );
}

export default CommonModal;
