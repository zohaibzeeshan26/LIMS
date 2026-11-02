import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => auditController.findAll(req, res, next));
router.get('/:entityName/:entityId', (req, res, next) => auditController.getByEntity(req, res, next));
router.post('/', (req, res, next) => auditController.create(req, res, next));

export default router;
