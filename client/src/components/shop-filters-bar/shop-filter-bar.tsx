import { Box, Button, Select, SelectMultiple, TextInput } from "grommet";
import { buttonStyles } from "../../helpers/formatting";
import { useEffect, useMemo, useState } from "react";
import {
    fetchAllProducts,
    fetchFilteredProducts
} from "../../store/products/productsThunks";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    selectAllProducts,
    selectProductsLoading
} from "../../store/products/productsSlice";

const priceRangeOptions = [
    "Under £20",
    "£20 - £50",
    "£50 - £100",
    "Over £100"
];

const onSaleOptions = ["Any", "On Sale", "Not On Sale"];

function ShopFilterBar() {
    const dispatch = useAppDispatch();
    const products = useAppSelector(selectAllProducts);
    const loading = useAppSelector(selectProductsLoading);

    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
    const [selectedOnSale, setSelectedOnSale] = useState<string>("Any");

    useEffect(() => {
        if (!products.length) {
            dispatch(fetchAllProducts());
        }
    }, [dispatch, products.length]);

    const categories = useMemo(
        () =>
            Array.from(
                new Set(products.map((product) => product.category).filter(Boolean))
            ).sort((a, b) => a.localeCompare(b)),
        [products]
    );

    const handleApplyFilters = () => {
        const filters: Record<string, string> = { is_live: "true" };

        if (selectedCategories.length) {
            filters.category = selectedCategories.join(",");
        }

        if (selectedOnSale === "On Sale") {
            filters.on_sale = "true";
        }

        if (selectedOnSale === "Not On Sale") {
            filters.on_sale = "false";
        }

        if (searchTerm.trim()) {
            filters.search = searchTerm.trim();
        }

        if (selectedPriceRanges.length) {
            filters.price_range = selectedPriceRanges.join(",");
        }

        dispatch(fetchFilteredProducts(filters));
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedCategories([]);
        setSelectedPriceRanges([]);
        setSelectedOnSale("Any");
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
                    />
                </Box>
                <Button
                    label={showFilters ? "Hide Filters" : "Show Filters"}
                    style={buttonStyles.default}
                    onClick={() => setShowFilters((prev) => !prev)}
                />
                <Button
                    label="Apply"
                    style={buttonStyles.default}
                    onClick={handleApplyFilters}
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

                    <Box width="medium">
                        <SelectMultiple
                            placeholder="Price Range"
                            options={priceRangeOptions}
                            value={selectedPriceRanges}
                            onChange={({ value }) => setSelectedPriceRanges(value as string[])}
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