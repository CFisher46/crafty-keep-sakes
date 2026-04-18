import { Box, Button, RangeInput, Select, SelectMultiple, Text, TextInput } from "grommet";
import { buttonStyles } from "../../helpers/formatting";
import { useEffect, useMemo, useState } from "react";
import {
    fetchAllProducts,
    fetchFilteredProducts
} from "../../store/products/productsThunks";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    selectAllProducts,
    selectCatalogPriceMax,
    selectCatalogPriceMin,
    selectProductsLoading
} from "../../store/products/productsSlice";

const onSaleOptions = ["Any", "On Sale", "Not On Sale"];

function ShopFilterBar() {
    const dispatch = useAppDispatch();
    const products = useAppSelector(selectAllProducts);
    const catalogPriceMin = useAppSelector(selectCatalogPriceMin);
    const catalogPriceMax = useAppSelector(selectCatalogPriceMax);
    const loading = useAppSelector(selectProductsLoading);

    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedOnSale, setSelectedOnSale] = useState<string>("Any");

    const domainMin = catalogPriceMin;
    const domainMax = catalogPriceMax;

    const clamp = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));

    const [priceMin, setPriceMin] = useState(0);
    const [priceMax, setPriceMax] = useState(0);

    const categories = useMemo(
        () =>
            Array.from(
                new Set(products.map((product) => product.category).filter(Boolean))
            ).sort((a, b) => a.localeCompare(b)),
        [products]
    );

    useEffect(() => {
        setPriceMin((currentMin) => {
            const clampedMin = clamp(currentMin, domainMin, domainMax);
            return clampedMin;
        });

        // Max should always default to the latest max value from products.
        setPriceMax(domainMax);
    }, [domainMin, domainMax]);

    useEffect(() => {
        if (priceMin > priceMax) {
            setPriceMax(priceMin);
        }
    }, [priceMin, priceMax]);

    const boundedPriceMin = clamp(priceMin, domainMin, domainMax);
    const boundedPriceMax = clamp(Math.max(priceMax, boundedPriceMin), domainMin, domainMax);

    const handleApplyFilters = (searchOnly = false) => {
        const filters: Record<string, string> = { is_live: "true" };

        if (!searchOnly && selectedCategories.length) {
            filters.category = selectedCategories.join(",");
        }

        if (!searchOnly && selectedOnSale === "On Sale") {
            filters.on_sale = "true";
        }

        if (!searchOnly && selectedOnSale === "Not On Sale") {
            filters.on_sale = "false";
        }

        if (searchTerm.trim()) {
            filters.product_name = searchTerm.trim();
        }

        if (!searchOnly && boundedPriceMin > domainMin) {
            filters.price_min = String(boundedPriceMin);
        }

        if (!searchOnly && boundedPriceMax < domainMax) {
            filters.price_max = String(boundedPriceMax);
        }

        dispatch(fetchFilteredProducts(filters));
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedCategories([]);
        setSelectedOnSale("Any");
        setPriceMin(domainMin);
        setPriceMax(domainMax);
        dispatch(fetchAllProducts());
    };

    return (
        <Box
            pad="medium"
            background="white"
            round="small"
            elevation="small"
            gap="small"
        >
            <Box direction="row" gap="small" wrap>
                <Box flex>
                    <TextInput
                        placeholder="Search for a product"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                handleApplyFilters(true);
                            }
                        }}
                    />
                </Box>
                <Button
                    label="Search"
                    style={buttonStyles.default}
                    onClick={() => handleApplyFilters(true)}
                    disabled={loading}
                />
                <Button
                    label={showFilters ? "Hide Filters" : "Show Filters"}
                    style={buttonStyles.default}
                    onClick={() => setShowFilters((prev) => !prev)}
                />
                <Button
                    label="Apply Filters"
                    style={buttonStyles.default}
                    onClick={() => handleApplyFilters(false)}
                    disabled={loading}
                />
                <Button
                    label="Reset"
                    style={buttonStyles.default}
                    onClick={handleResetFilters}
                    disabled={loading}
                />
            </Box>

            {showFilters && (
                <Box
                    pad="small"
                    round="small"
                    background="light-1"
                    direction="row"
                    gap="small"
                    wrap
                >
                    <Box width="medium">
                        <SelectMultiple
                            placeholder="Category"
                            options={categories}
                            value={selectedCategories}
                            onChange={({ value }) => setSelectedCategories(value as string[])}
                        />
                    </Box>

                    <Box width="medium" gap="xsmall">
                        <Text size="small">Min Price: £{boundedPriceMin}</Text>
                        <RangeInput
                            key={`min-${domainMin}-${boundedPriceMax}`}
                            min={domainMin}
                            max={boundedPriceMax}
                            step={1}
                            value={boundedPriceMin}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                setPriceMin(clamp(nextValue, domainMin, boundedPriceMax));
                            }}
                        />
                        <Text size="small">Max Price: £{boundedPriceMax}</Text>
                        <RangeInput
                            key={`max-${boundedPriceMin}-${domainMax}`}
                            min={boundedPriceMin}
                            max={domainMax}
                            step={1}
                            value={boundedPriceMax}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                setPriceMax(clamp(nextValue, boundedPriceMin, domainMax));
                            }}
                        />
                    </Box>

                    <Box width="small">
                        <Select
                            placeholder="On Sale"
                            options={onSaleOptions}
                            value={selectedOnSale}
                            onChange={({ option }) => setSelectedOnSale(option as string)}
                        />
                    </Box>
                </Box>
            )}
        </Box>
    );
}

export default ShopFilterBar;