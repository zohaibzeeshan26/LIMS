import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SamplesService } from './samples.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { SampleQueryDto } from './dto/sample-query.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Sampling & Accessioning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('samples')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.LAB_TECHNICIAN, Role.ANALYST)
  @ApiOperation({ summary: 'Accession / intake a new pharmaceutical sample (Transactional with AuditLog)' })
  @ApiResponse({ status: 201, description: 'Sample created successfully with unique sampleId and recordNumber' })
  @ApiResponse({ status: 409, description: 'Sample ID violates uniqueness policy' })
  create(@Body() createSampleDto: CreateSampleDto, @Request() req: any) {
    return this.samplesService.create(createSampleDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Query samples with pagination, search, laboratory, and status filters' })
  @ApiResponse({ status: 200, description: 'List of paginated sample records with metadata' })
  findAll(@Query() query: SampleQueryDto, @Request() req: any) {
    return this.samplesService.findAll(query, req.user);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get live sample KPI counts and status distribution' })
  getMetrics(@Query('laboratory') laboratory?: string) {
    return this.samplesService.getSampleMetrics(laboratory);
  }

  @Get('by-code')
  @ApiOperation({ summary: 'Get sample record by sampleCode, sampleId, accessionNo, or id' })
  @ApiResponse({ status: 200, description: 'Sample details retrieved' })
  @ApiResponse({ status: 404, description: 'Sample not found' })
  findByCode(@Query('code') code: string, @Request() req: any) {
    return this.samplesService.findOne(code, req.user);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get detailed sample record including laboratory, custody, tests, and submissions' })
  @ApiResponse({ status: 200, description: 'Sample details retrieved' })
  @ApiResponse({ status: 404, description: 'Sample not found' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.samplesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.TESTING_ANALYST, Role.ANALYST, Role.MANAGER, Role.DEPUTY_MANAGER, Role.SHIFT_INCHARGE)
  @ApiOperation({ summary: 'Update sample status or attributes with 21 CFR Part 11 audit logging (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sample updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateSampleDto: UpdateSampleDto,
    @Request() req: any,
  ) {
    return this.samplesService.update(id, updateSampleDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'Guarded deletion (Rejects silent destruction, enforces auditable archival)' })
  @ApiResponse({ status: 403, description: 'Direct permanent deletion prohibited under cGMP' })
  delete(@Param('id') id: string) {
    return this.samplesService.delete(id);
  }

  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Auditable archival workflow for sample retention (Admin only)' })
  archive(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.samplesService.archive(id, body.reason, req.user);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Auditable cancellation workflow with mandatory regulatory justification (Admin only)' })
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ) {
    return this.samplesService.cancel(id, body.reason, req.user);
  }

  @Post(':id/submissions')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Submit sample to destination laboratory (Microbiology, Chemical, Physical, SAF, etc.)' })
  createSubmission(
    @Param('id') id: string,
    @Body() dto: CreateSubmissionDto,
    @Request() req: any,
  ) {
    return this.samplesService.createSubmission(id, dto, req.user);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Get all workflow submissions for a sample' })
  getSampleSubmissions(@Param('id') id: string) {
    return this.samplesService.getSampleSubmissions(id);
  }

  @Post(':id/tests')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Assign an analytical test specification to a sample' })
  assignTest(
    @Param('id') id: string,
    @Body() body: { testSpecificationId: string; analystId?: string },
    @Request() req: any,
  ) {
    return this.samplesService.assignTest(
      id,
      body.testSpecificationId,
      body.analystId,
      req.user,
    );
  }

}
