import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { CasbinModule } from "@/frameworks/auth-services/casbin/casbin.module";
import { InternalUseCase } from "./internal.use-case";
import { InternalController } from "@/interfaces/controllers/internal/internal.controller";

@Module({
  imports: [ElasticsearchModule, ConfigModule, CasbinModule],
  controllers: [InternalController],
  providers: [InternalUseCase],
  exports: [InternalUseCase],
})
export class InternalModule {}
