import React, { useState } from "react";
import { Box, Button, Form, FormField, TextInput } from "grommet";

interface Product {
  [key: string]: any;
}

const initialProduct: Product = {
  id: "",
  category: "",
  description: "",
  price: "",
  quantity: "",
  on_sale: "",
  product_name: "",
  is_live: "",
  sale_percent: null,
  images: null
};

const DynamicProductForm = () => {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validateProduct = (prod: Product) => {
    const errors: { [key: string]: string } = {};
    if (!prod.product_name || prod.product_name.trim() === "") {
      errors.product_name = "Product name is required";
    }
    if (!prod.price || isNaN(Number(prod.price))) {
      errors.price = "Price must be a number";
    }
    if (!prod.quantity || isNaN(Number(prod.quantity))) {
      errors.quantity = "Quantity must be a number";
    }
    return errors;
  };

  const handleChange = (field: string, value: any) => {
    setProduct((prev) => ({
      ...prev,
      [field]: value
    }));

    setFormErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); // prevent native form submission

    const errors = validateProduct(product);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setLoading(true);
      // Simulate API call or dispatch redux action
      setTimeout(() => {
        alert("Product submitted: " + JSON.stringify(product, null, 2));
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <Box width="medium" pad="small">
      <Form onSubmit={handleSubmit}>
        {Object.keys(product).map((field) => (
          <FormField
            key={field}
            label={field.replace(/_/g, " ").toUpperCase()}
            error={formErrors[field]}
          >
            <TextInput
              name={field}
              value={product[field] ?? ""}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          </FormField>
        ))}

        <Button
          type="submit"
          label={loading ? "Submitting..." : "Submit"}
          primary
          disabled={loading}
        />
      </Form>
    </Box>
  );
};

export default DynamicProductForm;
