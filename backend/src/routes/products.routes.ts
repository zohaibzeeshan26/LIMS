import { Router } from 'express';
import { Role } from '@prisma/client';
import { productsController, uploadPdfMiddleware } from '../controllers/products.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ================= PRODUCT CATALOG & PDF DOCUMENTS =================
// 1. List all products with current attached PDF document
router.get('/', productsController.getAllProducts);

// 2. Create product
router.post(
  '/',
  requireRoles(Role.ADMIN, Role.DOCUMENTATION_MANAGER, Role.QA_MANAGER, Role.MANAGER),
  productsController.createProduct
);

// 3. Upload document via generic upload endpoint (with productId in body)
router.post(
  '/upload',
  requireRoles(Role.ADMIN, Role.DOCUMENTATION_MANAGER, Role.QA_MANAGER, Role.MANAGER),
  uploadPdfMiddleware.single('file'),
  productsController.uploadDocument
);

// 4. Get single product details
router.get('/:id', productsController.getProductById);

// 5. Get document version history for a product
router.get('/:id/documents', productsController.getProductDocuments);

// 6. Get current active PDF document for a product
router.get('/:id/current-document', productsController.getCurrentDocument);

// 7. Upload/replace PDF document for a specific product
router.post(
  '/:id/documents',
  requireRoles(Role.ADMIN, Role.DOCUMENTATION_MANAGER, Role.QA_MANAGER, Role.MANAGER),
  uploadPdfMiddleware.single('file'),
  productsController.uploadDocument
);

// 8. Delete a product
router.delete(
  '/:id',
  requireRoles(Role.ADMIN, Role.DOCUMENTATION_MANAGER, Role.QA_MANAGER, Role.MANAGER),
  productsController.deleteProduct
);

export default router;

