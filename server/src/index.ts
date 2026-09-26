import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import orgRoutes from './modules/organizations/organization.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import warehouseRoutes from './modules/warehouses/warehouse.routes.js';
import locationRoutes from './modules/locations/location.routes.js';
import stockRoutes from './modules/stock/stock.routes.js';
import receiptRoutes from './modules/receipts/receipt.routes.js';
import deliveryRoutes from './modules/deliveries/delivery.routes.js';
import transferRoutes from './modules/transfers/transfer.routes.js';
import adjustmentRoutes from './modules/adjustments/adjustment.routes.js';
import ledgerRoutes from './modules/ledger/ledger.routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/organizations', orgRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/ledger', ledgerRoutes);


// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
