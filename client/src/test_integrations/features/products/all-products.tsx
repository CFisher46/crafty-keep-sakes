import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectAllProducts,
  selectProductsLoading,
  selectProductsError
} from "../../../store/products/productsSlice";
import { fetchAllProducts } from "../../../store/products/productsThunks";

const GetAllProducts = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);
  const loading = useAppSelector(selectProductsLoading);
  const error = useAppSelector(selectProductsError);

  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>Error: {error}</p>;

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
                {product.images ? (
                  <ul>
                    {JSON.parse(product.images).map(
                      (image: string, index: number) => (
                        <li key={index}>
                          <img
                            src={image}
                            alt={`Product ${product.id} Image ${index + 1}`}
                            style={{ width: "100px" }}
                          />
                        </li>
                      )
                    )}
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

export default GetAllProducts;
