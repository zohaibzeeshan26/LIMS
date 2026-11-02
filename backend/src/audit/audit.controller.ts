import { Controller, Get, Post, Body, Query, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Audit Trail (21 CFR Part 11)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query immutable laboratory audit logs with filters' })
  findAll(
    @Query('entityName') entityName?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll({ entityName, action, limit });
  }

  @Get(':entityName/:entityId')
  @ApiOperation({ summary: 'Get complete audit history for a specific entity' })
  getByEntity(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getByEntity(entityName, entityId);
  }

  @Post()
  @ApiOperation({ summary: 'Record 21 CFR Part 11 compliant operational audit trail event' })
  create(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    return this.auditService.create({
      entityName: body.entityName || 'System',
      entityId: body.entityId || user?.id || 'GLOBAL',
      action: body.action || 'OPERATIONAL_ACTION',
      performedById: user?.id || user?.sub,
      performedByName: body.performedByName || user?.fullName || user?.username || 'Staff User',
      role: body.role || user?.role || 'QC_ANALYST',
      ipAddress,
      reasonForChange: body.reasonForChange || 'Laboratory operational activity recorded',
      diffPayload: typeof body.diffPayload === 'object' ? JSON.stringify(body.diffPayload) : body.diffPayload,
    });
  }
}
