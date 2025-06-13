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
  images: string[];
}

const GetProductById = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const id = "CKS_021";

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((response) => {
        const parsedResult = JSON.parse(response[0].result);
        const parsedData = JSON.parse(parsedResult.data).map(
          (product: any) => ({
            ...product,
            images: JSON.parse(product.images)
          })
        );
        setProducts(parsedData);
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  return (
    <div>
      <h2>A Specific Product</h2>
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
            <th>Images</th>
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
              <td>
                {product.images.length > 0 ? (
                  <ul>
                    {product.images.map((image, index) => (
                      <li key={index}>
                        <img
                          src={image}
                          alt={`Product ${product.id} Image ${index + 1}`}
                          style={{ width: "100px" }}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  "No images"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GetProductById;
