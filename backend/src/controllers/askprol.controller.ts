import { Request, Response, NextFunction } from 'express';
import { askprolService } from '../services/askprol.service';

export class AskprolController {
  async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = askprolService.calculate(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createReport(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await askprolService.createReport(req.body, user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { stage, batchNumber, limit } = req.query;
      const reports = await askprolService.findAll({
        stage: stage as string,
        batchNumber: batchNumber as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(reports);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const report = await askprolService.findById(id);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const id = String(req.params.id);
      const result = await askprolService.delete(id, user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const askprolController = new AskprolController();
