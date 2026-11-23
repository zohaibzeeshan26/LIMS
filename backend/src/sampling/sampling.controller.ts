import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SamplingService } from './sampling.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { SamplingQueryDto } from './dto/sample-query.dto';
import { SubmitSampleDto, UpdateSubmissionStatusDto } from './dto/submit-sample.dto';

@ApiTags('Sample Accession & Custody')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sampling')
export class SamplingController {
  constructor(private readonly samplingService: SamplingService) {}

  @Post()
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.LAB_TECHNICIAN, Role.ANALYST)
  @ApiOperation({ summary: 'Accession / intake a new pharmaceutical sample' })
  create(@Body() createSampleDto: CreateSampleDto, @Request() req: any) {
    return this.samplingService.create(createSampleDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Query samples with filters (status, type, priority, search, pagination)' })
  findAll(@Query() query: SamplingQueryDto, @Request() req: any) {
    return this.samplingService.findAll(query, req.user);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get live sample KPI counts and status distribution' })
  getMetrics(@Query('laboratory') laboratory?: string, @Query('lab') lab?: string, @Request() req?: any) {
    return this.samplingService.getSampleMetrics(laboratory || lab, req?.user);
  }

  @Get('next-sample-id')
  @ApiOperation({ summary: 'Preview next auto-sequential Sample ID for laboratory & section' })
  getNextSampleId(
    @Query('laboratory') laboratory?: string,
    @Query('lab') lab?: string,
    @Query('section') section?: string,
    @Query('stageType') stageType?: string,
  ) {
    return this.samplingService.getNextSampleIdPreview(laboratory || lab, section, stageType);
  }

  @Get('check-sample-id/:sampleCode')
  @ApiOperation({ summary: 'Check if a Sample ID is available or already registered' })
  checkSampleId(@Param('sampleCode') sampleCode: string) {
    return this.samplingService.checkSampleIdAvailability(sampleCode);
  }

  @Get('submissions/all')
  @ApiOperation({ summary: 'List all workflow submissions across laboratories' })
  getAllSubmissions(@Query() query: any) {
    return this.samplingService.getAllSubmissions(query);
  }

  @Patch('submissions/:submissionId/status')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.ANALYST, Role.TESTING_ANALYST, Role.MANAGER, Role.DEPUTY_MANAGER, Role.SHIFT_INCHARGE, Role.HOD)
  @ApiOperation({ summary: 'Update workflow submission status with 21 CFR Part 11 transition rule' })
  updateSubmissionStatus(
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateSubmissionStatusDto,
    @Request() req: any,
  ) {
    return this.samplingService.updateSubmissionStatus(submissionId, dto, req.user);
  }

  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.LAB_TECHNICIAN, Role.ANALYST, Role.TESTING_ANALYST, Role.MANAGER, Role.DEPUTY_MANAGER, Role.SHIFT_INCHARGE, Role.HOD)
  @ApiOperation({ summary: 'Route and submit a sample to Microbiology, Chemical, or Physical Lab' })
  submitToWorkflow(
    @Param('id') id: string,
    @Body() dto: SubmitSampleDto,
    @Request() req: any,
  ) {
    return this.samplingService.submitToWorkflow(id, dto, req.user);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Get all analytical workflow submissions for a sample' })
  getSampleSubmissions(@Param('id') id: string) {
    return this.samplingService.getSampleSubmissions(id);
  }


  @Get('by-code')
  @ApiOperation({ summary: 'Get sample record by sampleCode, sampleId, accessionNo, or id' })
  findByCode(@Query('code') code: string, @Request() req: any) {
    return this.samplingService.findOne(code, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed sample record including tests, custody, and OOS' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.samplingService.findOne(id, req.user);
  }


  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update sample status or attributes with audit trail entry (Admin only)' })
  update(
    @Param('id') id: string,
    @Body() updateSampleDto: UpdateSampleDto,
    @Request() req: any,
  ) {
    return this.samplingService.update(id, updateSampleDto, req.user);
  }
}
