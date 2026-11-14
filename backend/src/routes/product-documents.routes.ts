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

// 0. Pending document deletion requests (Admin & Super Admin only)
router.get(
  '/pending/deletions',
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD),
  productsController.getPendingDeletionRequests
);

// 0.1 Deletion updates & statuses (Documentation Manager & Administrators)
router.get(
  '/updates/deletions',
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD, Role.DOCUMENTATION_MANAGER),
  productsController.getDeletionUpdates
);

// 1. Get metadata for a specific document
router.get('/:id', productsController.getDocumentById);

// 2. Download / view PDF document file (.pdf)
router.get('/:id/file', productsController.streamDocumentFile);

// 3. Approve document deletion (Admin & Super Admin only)
router.post(
  '/:id/approve-deletion',
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD),
  productsController.approveDeletion
);

// 4. Reject document deletion (Admin & Super Admin only)
router.post(
  '/:id/reject-deletion',
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD),
  productsController.rejectDeletion
);

// 5. Delete document or submit deletion request (Admin, Super Admin, and Documentation Manager)
router.delete(
  '/:id',
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD, Role.DOCUMENTATION_MANAGER),
  productsController.deleteDocument
);

export default router;

