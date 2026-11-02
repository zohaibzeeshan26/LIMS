import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { askprolService, AskprolCalculationInput } from '../services/askprol.service';

@Injectable()
export class AskprolNestService {
  constructor(private prisma: PrismaService) {}

  calculate(input: AskprolCalculationInput) {
    return askprolService.calculate(input);
  }

  async createReport(input: AskprolCalculationInput, user?: any) {
    return askprolService.createReport(input, user);
  }

  async findAll(query?: { stage?: string; batchNumber?: string; limit?: number }) {
    return askprolService.findAll(query);
  }

  async findById(id: string) {
    return askprolService.findById(id);
  }

  async delete(id: string, user?: any) {
    return askprolService.delete(id, user);
  }
}
