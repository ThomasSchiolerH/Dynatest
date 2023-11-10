import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {DB_LIRAMAP_CONFIG} from "./config/database";
import {ConditionsController} from "./conditions/conditions.controller";
import {ConditionsService} from "./conditions/conditions.service";
import {DataSource} from "typeorm";
import { MinioClientModule } from './minio-client/minio-client.module';

@Module({
  imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      MinioClientModule,
      TypeOrmModule.forRootAsync({
          name: 'lira-map',
          imports: [ConfigModule],
          inject: [ConfigService],
          useClass: DB_LIRAMAP_CONFIG,
          dataSourceFactory: async options => {
              return await new DataSource(options).initialize();
          }
      })
  ],
  controllers: [ConditionsController],
  providers: [ConditionsService],
})
export class AppModule {}
