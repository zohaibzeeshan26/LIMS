import { Module } from '@nestjs/common';
import { AskprolNestController } from './askprol.controller';
import { AskprolNestService } from './askprol.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AskprolNestController],
  providers: [AskprolNestService],
  exports: [AskprolNestService],
})
export class AskprolModule {}
