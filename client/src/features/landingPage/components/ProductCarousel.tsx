import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Text } from 'grommet';
import { Product } from '../../../types';
import ProductCard from './ProductCard';
import SectionHeading from './SectionHeading';
import { ui } from '../../../helpers/theme';

interface ProductCarouselProps {
  products: Product[];
  title: string;
  subtitle?: string;
  emptyText: string;
  onOpenModal: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

const CAROUSEL_STEP = 240;

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  title,
  subtitle,
  emptyText,
  onOpenModal,
  onAddToCart,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [loopCards, setLoopCards] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const scrollGeneration = useRef(0);

  const getLoopCycleWidth = () => {
    const el = carouselRef.current;
    const count = products.length;
    if (!el || count < 2 || el.children.length < count * 2) return 0;
    const first = el.children[0] as HTMLElement;
    const firstClone = el.children[count] as HTMLElement;
    return firstClone.offsetLeft - first.offsetLeft;
  };

  const setScrollLeftInstant = (el: HTMLDivElement, left: number) => {
    const behavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = left;
    el.style.scrollBehavior = behavior || 'smooth';
  };

  const normalizeLoopScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cycle = getLoopCycleWidth();
    if (cycle <= 0) return;
    if (el.scrollLeft >= cycle) {
      setScrollLeftInstant(el, el.scrollLeft % cycle);
    }
  };

  const updateCarouselButtons = () => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const cycle = getLoopCycleWidth();
    const singleSetOverflows =
      cycle > 0 ? cycle > clientWidth + 1 : scrollWidth > clientWidth + 1;
    const shouldLoop = products.length > 1 && singleSetOverflows;

    setLoopCards(shouldLoop);
    if (shouldLoop) {
      setCanScrollLeft(true);
      setCanScrollRight(true);
      return;
    }
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;

    const generation = ++scrollGeneration.current;
    const cycle = getLoopCycleWidth();
    const overflows = el.scrollWidth > el.clientWidth + 1;

    let timeoutId = 0;
    const finish = () => {
      window.clearTimeout(timeoutId);
      if (scrollGeneration.current !== generation) return;
      normalizeLoopScroll();
      updateCarouselButtons();
    };

    const startSmoothScroll = () => {
      if (scrollGeneration.current !== generation || !carouselRef.current) return;
      carouselRef.current.addEventListener('scrollend', finish, { once: true });
      carouselRef.current.scrollBy({
        left: direction * CAROUSEL_STEP,
        behavior: 'smooth',
      });
      timeoutId = window.setTimeout(finish, 700);
    };

    if (cycle > 0 && overflows && direction < 0 && el.scrollLeft < CAROUSEL_STEP) {
      setScrollLeftInstant(el, el.scrollLeft + cycle);
      requestAnimationFrame(startSmoothScroll);
      return;
    }

    startSmoothScroll();
  };

  const updateCarouselButtonsRef = useRef(updateCarouselButtons);
  updateCarouselButtonsRef.current = updateCarouselButtons;

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateCarouselButtonsRef.current());
    const onResize = () => updateCarouselButtonsRef.current();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [products]);

  return (
    <Box gap="small">
      <Box direction="row" justify="between" align="center">
        <SectionHeading title={title} subtitle={subtitle} />
        {products.length > 0 && (
          <Box direction="row" gap="xsmall">
            <Button
              plain
              label="‹"
              disabled={!canScrollLeft}
              onClick={() => scrollCarousel(-1)}
              style={{
                minWidth: '36px',
                height: '36px',
                padding: '0 10px',
                fontSize: '18px',
                lineHeight: '1',
                borderRadius: '2px',
                color: ui.ink,
                background: 'transparent',
                border: `1px solid ${ui.line}`,
              }}
            />
            <Button
              plain
              label="›"
              disabled={!canScrollRight}
              onClick={() => scrollCarousel(1)}
              style={{
                minWidth: '36px',
                height: '36px',
                padding: '0 10px',
                fontSize: '18px',
                lineHeight: '1',
                borderRadius: '2px',
                color: ui.ink,
                background: 'transparent',
                border: `1px solid ${ui.line}`,
              }}
            />
          </Box>
        )}
      </Box>

      {products.length === 0 ? (
        <Box
          pad="medium"
          background={ui.sand}
          round="xsmall"
          align="center"
          border={{ color: ui.line, size: 'xsmall' }}
        >
          <Text color="dark-4">{emptyText}</Text>
        </Box>
      ) : (
        <Box
          direction="row"
          overflow="hidden"
          ref={carouselRef}
          onScroll={updateCarouselButtons}
          pad={{ vertical: 'xsmall' }}
          gap="small"
          style={{
            whiteSpace: 'nowrap',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
          }}
        >
          {[...products, ...(loopCards ? products : [])].map((product, index) => {
            const isClone = index >= products.length;
            const uniqueKey = isClone ? `${product.id}-loop-${index}` : `${product.id}-${index}`;

            return (
              <div
                key={uniqueKey}
                aria-hidden={isClone || undefined}
                inert={isClone || undefined}
                style={{ display: 'inline-block' }}
              >
                <ProductCard
                  product={product}
                  onOpenModal={onOpenModal}
                  onAddToCart={onAddToCart}
                  hovered={hoveredCard === uniqueKey}
                  onMouseEnter={() => setHoveredCard(uniqueKey)}
                  onMouseLeave={() => setHoveredCard(null)}
                />
              </div>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default ProductCarousel;
