import { Router } from 'express';
import { askprolController } from '../controllers/askprol.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Allow calculation previews without strict blocking, but authenticate for saving
router.post('/calculate', (req, res, next) => askprolController.calculate(req, res, next));

// Authenticated endpoints
router.use(authenticateToken);

router.post('/reports', (req, res, next) => askprolController.createReport(req, res, next));
router.get('/reports', (req, res, next) => askprolController.findAll(req, res, next));
router.get('/reports/:id', (req, res, next) => askprolController.findById(req, res, next));
router.delete('/reports/:id', (req, res, next) => askprolController.delete(req, res, next));

export default router;
