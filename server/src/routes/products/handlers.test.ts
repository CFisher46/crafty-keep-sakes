import express from 'express';
import request from 'supertest';
import createProductRouter from './create/handler';
import getProductByIdRouter from './get-by-id/handler';
import getFilteredProductsRouter from './get-filtered/handler';
import getProductsRouter from './get/handler';
import uploadImagesRouter from './images/uploadImages/handler';
import updateProductRouter from './update/handler';
import { db } from '../../ts-common/database';

let mockUploadedFiles: Array<Partial<Express.Multer.File>> | undefined;

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('multer', () => {
  const multer = () => ({
    array: () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.files = mockUploadedFiles as Express.Multer.File[] | undefined;
      next();
    }
  });

  multer.diskStorage = jest.fn(() => ({}));

  return multer;
});

const mockedDatabase = db as unknown as { query: jest.Mock };

function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/products', getProductsRouter);
  app.use('/api/products', getFilteredProductsRouter);
  app.use('/api/products', getProductByIdRouter);
  app.use('/api/products', createProductRouter);
  app.use('/api/products', updateProductRouter);
  app.use('/api/products', uploadImagesRouter);

  return app;
}

describe('product handlers', () => {
  beforeEach(() => {
    mockedDatabase.query.mockReset();
    mockUploadedFiles = undefined;
  });

  it('returns parsed products from GET /api/products', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [{ result: JSON.stringify({ data: [{ id: 'prod-1' }], total_count: 1 }) }]
    ]);

    const response = await request(app).get('/api/products/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [{ id: 'prod-1' }], total_count: 1 });
  });

  it('returns 500 when GET /api/products fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app).get('/api/products/');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('parses images on GET /api/products/filter', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            data: [
              {
                id: 'prod-2',
                images: JSON.stringify(['/images/one.jpg'])
              }
            ]
          })
        }
      ]
    ]);

    const response = await request(app).get('/api/products/filter?product_name=one');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{ id: 'prod-2', images: ['/images/one.jpg'] }]
    });
  });

  it('falls back to an empty array when filtered product images are invalid JSON', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            data: [{ id: 'prod-3', images: 'not-json' }]
          })
        }
      ]
    ]);

    const response = await request(app).get('/api/products/filter');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [{ id: 'prod-3', images: [] }] });
  });

  it('returns a product from GET /api/products/:id', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([[{ id: 'prod-4', product_name: 'Frame' }]]);

    const response = await request(app).get('/api/products/prod-4');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'prod-4', product_name: 'Frame' }]);
  });

  it('creates a product with normalized values', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([{ insertId: 55 }]);

    const response = await request(app)
      .post('/api/products/')
      .send({
        id: 'prod-5',
        category: 'gift',
        description: 'desc',
        price: '19.99',
        quantity: '3',
        on_sale: 'true',
        product_name: 'New Item',
        is_live: '1',
        sale_percent: '15',
        images: ''
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Product created', insertId: 55 });
    expect(mockedDatabase.query).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid product payloads before hitting the database', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/products/')
      .send({
        id: 'prod-6',
        category: 'gift',
        description: 'desc',
        price: 'abc',
        quantity: '3',
        on_sale: true,
        product_name: 'Broken Item',
        is_live: true,
        sale_percent: 0,
        images: ''
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid price' });
    expect(mockedDatabase.query).not.toHaveBeenCalled();
  });

  it('updates a product', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/products/prod-7')
      .send({ product_name: 'Updated Product' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Product updated', affectedRows: 1 });
  });

  it('returns 500 when product update fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .put('/api/products/prod-8')
      .send({ product_name: 'Updated Product' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('rejects product image uploads with no files', async () => {
    const app = createTestApp();

    mockUploadedFiles = [];

    const response = await request(app).post('/api/products/prod-9/images/upload');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'No images were uploaded' });
  });

  it('uploads product images and stores the generated paths', async () => {
    const app = createTestApp();

    mockUploadedFiles = [{ filename: 'first.jpg' }, { filename: 'second.jpg' }];
    mockedDatabase.query.mockResolvedValue([{}]);

    const response = await request(app).post('/api/products/prod-10/images/upload');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'Images uploaded',
      images: ['/images/first.jpg', '/images/second.jpg']
    });
    expect(mockedDatabase.query).toHaveBeenCalledTimes(2);
  });
});