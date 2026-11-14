import { Router } from 'express';
import { samplingController } from '../controllers/sampling.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.LAB_TECHNICIAN, Role.ANALYST), (req, res, next) =>
  samplingController.create(req, res, next)
);

router.get('/', (req, res, next) => samplingController.findAll(req, res, next));
router.get('/metrics', (req, res, next) => samplingController.getMetrics(req, res, next));
router.get('/next-sample-id', (req, res, next) => samplingController.getNextSampleId(req, res, next));
router.get('/check-sample-id/:sampleCode', (req, res, next) => samplingController.checkSampleId(req, res, next));
router.get('/submissions/all', (req, res, next) => samplingController.getAllSubmissions(req, res, next));
router.patch(
  '/submissions/:submissionId/status',
  requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST),
  (req, res, next) => samplingController.updateSubmissionStatus(req, res, next)
);

router.post('/:id/submit', requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.LAB_TECHNICIAN, Role.ANALYST), (req, res, next) =>
  samplingController.submitToWorkflow(req, res, next)
);

router.get('/:id/submissions', (req, res, next) => samplingController.getSampleSubmissions(req, res, next));
router.get('/by-code', (req, res, next) => samplingController.findByCode(req, res, next));
router.get('/:id', (req, res, next) => samplingController.findOne(req, res, next));
router.patch('/:id', requireRoles(Role.ADMIN, Role.DEPUTY_MANAGER, Role.QC_ANALYST), (req, res, next) => samplingController.update(req, res, next));

export default router;
