import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AskprolNestService } from './askprol.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Askprol QC Test Management & CoA Automation')
@Controller('askprol')
export class AskprolNestController {
  constructor(private readonly askprolService: AskprolNestService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate quantitative and system suitability results for Askprol' })
  calculate(@Body() body: any) {
    return this.askprolService.calculate(body);
  }

  @Post('reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save Askprol QC report and generate CoA' })
  createReport(@Body() body: any, @Req() req: any) {
    return this.askprolService.createReport(body, req.user);
  }

  @Get('reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List Askprol QC reports' })
  findAll(
    @Query('stage') stage?: string,
    @Query('batchNumber') batchNumber?: string,
    @Query('limit') limit?: number,
  ) {
    return this.askprolService.findAll({ stage, batchNumber, limit });
  }

  @Get('reports/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Askprol QC report details by ID' })
  findById(@Param('id') id: string) {
    return this.askprolService.findById(id);
  }
}
