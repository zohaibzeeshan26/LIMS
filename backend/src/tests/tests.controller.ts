import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { RecordResultDto } from './dto/record-result.dto';
import { CreateSpecDto } from './dto/create-spec.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, Role } from '../auth/roles.decorator';

@ApiTags('Analytical Testing & Worksheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get('specifications')
  @ApiOperation({ summary: 'List all master test specifications & pharmacopeial monographs' })
  findAllSpecifications() {
    return this.testsService.findAllSpecifications();
  }

  @Post('specifications')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'Create a new test monograph / specification' })
  createSpecification(@Body() dto: CreateSpecDto, @Request() req: any) {
    return this.testsService.createSpecification(dto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sample test worksheet record' })
  getTestById(@Param('id') id: string) {
    return this.testsService.getTestById(id);
  }

  @Patch(':id/record-result')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST, Role.TESTING_ANALYST, Role.ANALYST)
  @ApiOperation({ summary: 'Record test result with automatic Out-of-Specification calculation' })
  recordResult(
    @Param('id') id: string,
    @Body() dto: RecordResultDto,
    @Request() req: any,
  ) {
    return this.testsService.recordResult(id, dto, req.user);
  }

  @Patch(':id/verify')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'QA / Senior QC Verification of analytical test' })
  verifyTest(@Param('id') id: string, @Request() req: any) {
    return this.testsService.verifyTest(id, req.user);
  }
}
