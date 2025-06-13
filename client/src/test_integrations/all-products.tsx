import React, { useEffect, useState } from "react";

interface Product {
  id: string;
  category: string;
  description: string;
  price: string;
  quantity: string;
  on_sale: string;
  product_name: string;
  is_live: string;
  sale_percent: string | null;
}

const GetAllProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        const parsedResult = JSON.parse(data[0].result);
        const parsedData = JSON.parse(parsedResult.data);
        setProducts(parsedData);
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  return (
    <div>
      <h2>Product List</h2>
      <table border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Description</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>On Sale</th>
            <th>Product Name</th>
            <th>Is Live</th>
            <th>Sale Percent</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.category}</td>
              <td>{product.description}</td>
              <td>{product.price}</td>
              <td>{product.quantity}</td>
              <td>{product.on_sale}</td>
              <td>{product.product_name}</td>
              <td>{product.is_live}</td>
              <td>{product.sale_percent ?? "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GetAllProducts;
