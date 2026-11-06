import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LaboratoriesService } from './laboratories.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { LogCalibrationDto } from './dto/log-calibration.dto';
import { SampleQueryDto } from '../samples/dto/sample-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Laboratories & Metrology')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('laboratories')
export class LaboratoriesController {
  constructor(private readonly laboratoriesService: LaboratoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all laboratories (SAF Lab, Penicillin Lab, General Lab) with metrics' })
  @ApiResponse({ status: 200, description: 'List of configured laboratories' })
  findAllLaboratories() {
    return this.laboratoriesService.findAllLaboratories();
  }

  @Get('operations/summary')
  @ApiOperation({ summary: 'Get unified laboratory operations summary across General, Cephalosporin, and Penicillin labs' })
  getOperationsSummary(@Query() query: any, @Request() req: any) {
    return this.laboratoriesService.getLabOperationsSummary(query, req.user);
  }

  @Get('operations/:labId')
  @ApiOperation({ summary: 'Get detailed operations metrics, analyst workload, and sample history for a specific laboratory' })
  getIndividualOperations(
    @Param('labId') labId: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return this.laboratoriesService.getIndividualLabOperations(labId, query, req.user);
  }

  @Get(':laboratoryId/samples')
  @ApiOperation({ summary: 'Get all samples belonging to a specific laboratory with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated laboratory sample records' })
  findLaboratorySamples(
    @Param('laboratoryId') laboratoryId: string,
    @Query() query: SampleQueryDto,
  ) {
    return this.laboratoriesService.findLaboratorySamples(laboratoryId, query);
  }

  @Get('instruments')
  @ApiOperation({ summary: 'List all laboratory instruments with calibration health status' })
  findAll() {
    return this.laboratoriesService.findAll();
  }

  @Get('instruments/:id')
  @ApiOperation({ summary: 'Get instrument details with calibration logs and recent tests' })
  findOne(@Param('id') id: string) {
    return this.laboratoriesService.findOne(id);
  }

  @Post('instruments')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Register a new analytical instrument in the laboratory directory' })
  create(@Body() dto: CreateInstrumentDto, @Request() req: any) {
    return this.laboratoriesService.create(dto, req.user);
  }

  @Post('instruments/:id/calibration')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Log a new calibration event with certificate and due date recalculation' })
  logCalibration(
    @Param('id') id: string,
    @Body() dto: LogCalibrationDto,
    @Request() req: any,
  ) {
    return this.laboratoriesService.logCalibration(id, dto, req.user);
  }
}
