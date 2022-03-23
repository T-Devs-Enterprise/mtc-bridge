import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CronService } from './cron/cron.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'controlporsatelite.com',
      username: 'retx',
      password: '92168GbW02e',
      database: 'gps',
      entities: [],
      synchronize: true,
    }),
    HttpModule,
    CacheModule.register({ ttl: 0 }),
  ],
  controllers: [AppController],
  providers: [AppService, CronService],
})
export class AppModule {}
