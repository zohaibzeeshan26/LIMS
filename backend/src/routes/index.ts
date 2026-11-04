import { Router } from 'express';
import authRoutes from './auth.routes';
import samplingRoutes from './sampling.routes';
import samplesRoutes from './samples.routes';
import batchesRoutes from './batches.routes';
import testsRoutes from './tests.routes';
import auditRoutes from './audit.routes';
import laboratoriesRoutes from './laboratories.routes';
import instrumentsRoutes from './instruments.routes';
import categoriesRoutes from './categories.routes';
import oosRoutes from './oos.routes';
import usersRoutes from './users.routes';
import submissionsRoutes from './submissions.routes';
import analyticsRoutes from './analytics.routes';
import askprolRoutes from './askprol.routes';
import productsRoutes from './products.routes';
import productDocumentsRoutes from './product-documents.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/sampling', samplingRoutes);
apiRouter.use('/samples', samplesRoutes);
apiRouter.use('/batches', batchesRoutes);
apiRouter.use('/tests', testsRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/laboratories', laboratoriesRoutes);
apiRouter.use('/instruments', instrumentsRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/oos', oosRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/submissions', submissionsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/askprol', askprolRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/product-documents', productDocumentsRoutes);

// Root API endpoint
apiRouter.get('/', (req, res) => {
  res.json({
    service: 'City Pharma LIMS API',
    status: 'online',
    version: '1.0.0',
    healthCheck: '/api/v1/health',
    frontendUrl: 'http://localhost:3000',
    endpoints: [
      '/api/v1/auth',
      '/api/v1/sampling',
      '/api/v1/samples',
      '/api/v1/batches',
      '/api/v1/tests',
      '/api/v1/audit',
      '/api/v1/laboratories',
      '/api/v1/instruments',
      '/api/v1/categories',
      '/api/v1/oos',
      '/api/v1/users',
      '/api/v1/submissions',
      '/api/v1/analytics',
      '/api/v1/askprol',
      '/api/v1/products',
      '/api/v1/product-documents',
    ],
  });
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'City Pharma LIMS API (Node.js + Express)',
  });
});

export default apiRouter;
