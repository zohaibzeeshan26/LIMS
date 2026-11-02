import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SamplingModule } from './sampling/sampling.module';
import { LaboratoriesModule } from './laboratories/laboratories.module';
import { CategoriesModule } from './categories/categories.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
// Backwards-compatible modules
import { SamplesModule } from './samples/samples.module';
import { TestsModule } from './tests/tests.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { BatchesModule } from './batches/batches.module';
import { OosModule } from './oos/oos.module';
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AskprolModule } from './askprol/askprol.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SamplingModule,
    LaboratoriesModule,
    CategoriesModule,
    SubmissionsModule,
    AuditLogsModule,
    // Supporting both new and legacy routes
    SamplesModule,
    TestsModule,
    InstrumentsModule,
    BatchesModule,
    OosModule,
    AuditModule,
    AnalyticsModule,
    AskprolModule,
  ],
})
export class AppModule {}
