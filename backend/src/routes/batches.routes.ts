import { Router } from 'express';
import { batchesController } from '../controllers/batches.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => batchesController.findAll(req, res, next));
router.get('/coas', (req, res, next) => batchesController.getAllCoas(req, res, next));
router.get('/:id', (req, res, next) => batchesController.findOne(req, res, next));
router.post('/', requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST), (req, res, next) =>
  batchesController.create(req, res, next)
);
router.patch('/:id/release', requireRoles(Role.ADMIN, Role.QA_MANAGER), (req, res, next) =>
  batchesController.releaseBatch(req, res, next)
);
router.post('/coa', requireRoles(Role.ADMIN, Role.QA_MANAGER), (req, res, next) =>
  batchesController.issueCoa(req, res, next)
);

export default router;
