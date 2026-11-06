import { Router } from 'express';
import { laboratoriesController } from '../controllers/laboratories.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => laboratoriesController.findAllLaboratories(req, res, next));
router.get('/instruments', (req, res, next) => laboratoriesController.findAllInstruments(req, res, next));
router.get('/instruments/:id', (req, res, next) => laboratoriesController.findOneInstrument(req, res, next));
router.post(
  '/instruments',
  requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN),
  (req, res, next) => laboratoriesController.createInstrument(req, res, next)
);
router.post(
  '/instruments/:id/calibration',
  requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN, Role.QC_ANALYST),
  (req, res, next) => laboratoriesController.logCalibration(req, res, next)
);

// Lab Operations Dashboard endpoints
router.get('/operations/summary', (req, res, next) =>
  laboratoriesController.getLabOperationsSummary(req, res, next)
);

router.get('/operations/:labId', (req, res, next) =>
  laboratoriesController.getIndividualLabOperations(req, res, next)
);

router.get('/:laboratoryId/samples', (req, res, next) =>
  laboratoriesController.findLaboratorySamples(req, res, next)
);

export default router;
