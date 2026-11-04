import { Request, Response, NextFunction } from 'express';
import { batchesService } from '../services/batches.service';

export class BatchesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await batchesService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await batchesService.findOne(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await batchesService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAllCoas(req: Request, res: Response, next: NextFunction) {
    try {
      const coas = await batchesService.getAllCoas();
      res.json(coas);
    } catch (err) {
      next(err);
    }
  }

  async releaseBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { decision, notes } = req.body;
      const result = await batchesService.releaseBatch(req.params.id as string, decision, notes, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async issueCoa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await batchesService.issueCoa(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const batchesController = new BatchesController();
