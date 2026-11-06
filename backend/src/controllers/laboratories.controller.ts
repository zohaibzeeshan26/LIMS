import { Request, Response, NextFunction } from 'express';
import { laboratoriesService } from '../services/laboratories.service';

export class LaboratoriesController {
  async findAllLaboratories(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.findAllLaboratories();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findLaboratorySamples(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.findLaboratorySamples(req.params.laboratoryId as string, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findAllInstruments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOneInstrument(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.findOne(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createInstrument(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async logCalibration(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.logCalibration(req.params.id as string, req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getLabOperationsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.getLabOperationsSummary(req.query, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getIndividualLabOperations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await laboratoriesService.getIndividualLabOperations(req.params.labId as string, req.query, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const laboratoriesController = new LaboratoriesController();
