import { Router } from 'express';
import { testsController } from '../controllers/tests.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/specifications', (req, res, next) => testsController.findAllSpecifications(req, res, next));
router.post('/specifications', requireRoles(Role.ADMIN, Role.QA_MANAGER), (req, res, next) =>
  testsController.createSpecification(req, res, next)
);
router.get('/:id', (req, res, next) => testsController.getTestById(req, res, next));
router.patch(
  '/:id/record-result',
  requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.ANALYST),
  (req, res, next) => testsController.recordResult(req, res, next)
);
router.patch('/:id/verify', requireRoles(Role.ADMIN, Role.QA_MANAGER), (req, res, next) =>
  testsController.verifyTest(req, res, next)
);

export default router;
