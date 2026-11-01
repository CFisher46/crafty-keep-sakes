import ReportView, { ReportColumn } from './ReportView';
import { HorizontalBarChart } from '../charts';

interface ProductRow {
  sku: string;
  product_name: string;
  stock: number;
  units_sold: number;
  revenue: number;
  orders: number;
}

const columns: ReportColumn<ProductRow>[] = [
  { key: 'product', label: 'Product', value: (row) => row.product_name },
  { key: 'sku', label: 'SKU', value: (row) => row.sku },
  { key: 'units', label: 'Units sold', numeric: true, value: (row) => row.units_sold },
  { key: 'orders', label: 'Orders', numeric: true, value: (row) => row.orders },
  { key: 'revenue', label: 'Revenue (£)', numeric: true, value: (row) => row.revenue.toFixed(2) },
  { key: 'stock', label: 'In stock', numeric: true, value: (row) => row.stock },
];

const extractRows = (data: unknown) => data as ProductRow[];

const renderCharts = (rows: ProductRow[]) => {
  const sold = rows.filter((row) => row.units_sold > 0);
  return (
    <>
      <HorizontalBarChart
        title="Top products by units sold"
        data={sold.slice(0, 10).map((row) => ({ label: row.product_name, value: row.units_sold }))}
        emptyMessage="No sales in this period."
      />
      <HorizontalBarChart
        title="Top products by revenue (£)"
        data={[...sold]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map((row) => ({ label: row.product_name, value: row.revenue }))}
        format={(value) => value.toFixed(2)}
        emptyMessage="No sales in this period."
      />
    </>
  );
};

export default function ProductsReportPage() {
  return (
    <ReportView<ProductRow>
      title="Product sales"
      description="Volumes sold per product, best sellers first. Products with no sales appear at the bottom."
      endpoint="/products"
      filename="product-sales"
      columns={columns}
      extractRows={extractRows}
      renderCharts={renderCharts}
      dateHint="Dates filter on when the order was placed. Cancelled orders are excluded."
    />
  );
}
