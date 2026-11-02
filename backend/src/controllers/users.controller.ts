import { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/users.service';

export class UsersController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.findOne(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.update(req.params.id as string, req.body);
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
      const result = await usersService.updateRole(req.params.id as string, role);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterUserId = (req.user as any)?.id;
      const result = await usersService.delete(req.params.id as string, requesterUserId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
