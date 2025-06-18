import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { fetchProductById } from "../../../store/products/productsThunks";
import { selectSelectedProduct } from "../../../store/products/productSelectors";

const GetProductById = () => {
  const dispatch = useAppDispatch();
  const product = useAppSelector(selectSelectedProduct);
  const loading = useAppSelector((state) => state.products.loading);
  const error = useAppSelector((state) => state.products.error);
  const id = "CKS_021";

  useEffect(() => {
    dispatch(fetchProductById(id));
  }, [id, dispatch]);

  if (loading) return <p>Loading product...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!product) return <p>No product found.</p>;

  const images: string[] = Array.isArray(product.images)
    ? product.images
    : typeof product.images === "string"
    ? JSON.parse(product.images)
    : [];

  return (
    <div>
      <h2>Product Details</h2>
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
              {images.length > 0 ? (
                <ul>
                  {images.map((img, idx) => (
                    <li key={idx}>
                      <img
                        src={img}
                        alt={`Product ${product.id} Image ${idx + 1}`}
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
        </tbody>
      </table>
    </div>
  );
};

export default GetProductById;
