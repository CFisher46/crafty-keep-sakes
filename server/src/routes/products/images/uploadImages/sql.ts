export const ADD_IMAGE_TO_PRODUCT_QUERY = `
	INSERT INTO product_images (product_id, image_path)
	VALUES (?, ?)
`;
