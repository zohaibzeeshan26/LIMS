import { Router } from 'express';
import { Role } from '@prisma/client';
import { productsController } from '../controllers/products.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';

const router = Router();

// Streaming file endpoint: Allows token via query param `?token=...` or Authorization header
router.use((req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  authenticateToken(req, res, next);
});

// 1. Get metadata for a specific document
router.get('/:id', productsController.getDocumentById);

// 2. Download / view PDF document file (.pdf)
router.get('/:id/file', productsController.streamDocumentFile);

// 3. Delete document (Admin only)
router.delete('/:id', requireRoles(Role.ADMIN), productsController.deleteDocument);

export default router;

