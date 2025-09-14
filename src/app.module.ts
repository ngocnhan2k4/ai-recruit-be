import { Module } from '@nestjs/common';
import {
  UserController,
} from './intefaces/controllers';
import { UserUseCasesModule } from './use-cases/user/user-use-cases.module';

@Module({
  imports: [
    UserUseCasesModule,
  ],
  controllers: [
    UserController,
  ],
  providers: [],
})
export class AppModule {}