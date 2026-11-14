import { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/users.service';

export class UsersController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req.user as any)?.role;
      const result = await usersService.findAll(userRole);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req.user as any)?.role;
      const result = await usersService.findOne(req.params.id as string, userRole);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req.user as any)?.role;
      if (req.body.role === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
        res.status(403).json({ message: 'Access Denied: Only Super Admin can provision Super Admin users' });
        return;
      }
      const result = await usersService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req.user as any)?.role;
      const result = await usersService.update(req.params.id as string, req.body, userRole);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.body;
      if (!role) {
        res.status(400).json({ message: 'Role is required' });
        return;
      }
      const userRole = (req.user as any)?.role;
      const result = await usersService.updateRole(req.params.id as string, role, userRole);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterUserId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role;
      const result = await usersService.delete(req.params.id as string, requesterUserId, userRole);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
