import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

// Read endpoints accessible to all authenticated laboratory personnel
router.get('/', (req, res, next) => usersController.findAll(req, res, next));
router.get('/:id', (req, res, next) => usersController.findOne(req, res, next));

// Administrative user management actions (ADMIN, MANAGER)
router.post('/', requireRoles(Role.ADMIN, Role.MANAGER), (req, res, next) => usersController.create(req, res, next));
router.put('/:id', requireRoles(Role.ADMIN, Role.MANAGER), (req, res, next) => usersController.update(req, res, next));
router.patch('/:id', requireRoles(Role.ADMIN, Role.MANAGER), (req, res, next) => usersController.update(req, res, next));
router.patch('/:id/role', requireRoles(Role.ADMIN, Role.MANAGER), (req, res, next) => usersController.updateRole(req, res, next));
router.delete('/:id', requireRoles(Role.ADMIN, Role.MANAGER), (req, res, next) => usersController.delete(req, res, next));

export default router;
