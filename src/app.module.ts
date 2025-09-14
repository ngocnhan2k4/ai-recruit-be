import { Module } from '@nestjs/common';
import {
  UserController,
} from './intefaces/controllers';
import { DataServicesModule } from './service/data-services/data-services.module';
import { UserUseCasesModule } from './use-cases/user/user-use-cases.module';

@Module({
  imports: [
    DataServicesModule,
    UserUseCasesModule,
  ],
  controllers: [
    UserController,
  ],
  providers: [],
})
export class AppModule {}