import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { format } from 'date-fns';
import { lastValueFrom, map } from 'rxjs';
import { Connection } from 'typeorm';

@Injectable()
export class CronService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private readonly logger = new Logger(CronService.name);

  //@Cron('10,20,30,40,50,60 * * * * *')
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    const rawData = await this.connection.query(
      'select tracker.lat,tracker.lon,tracker.velocidad,tracker.direccion,tracker.time,unidades.placa FROM tracker,unidades where tracker.id_empresa=unidades.id_empresa AND tracker.id_tracker=unidades.gps_set AND tracker.id_empresa=16 AND tracker.u_time>(now() - interval 5 second)',
    );
    const parsedData = this.mapData(rawData);
    this.logger.verbose(`dataLength => ${parsedData.length}`);

    if (parsedData.length > 0) {
      //this.logger.verbose(
      //  `example => ${JSON.stringify(parsedData.slice(0, 4), null, 2)}`,
      //);
      this.sendDataToMtc(parsedData);
    }
  }

  mapData(data: Array<any>): Array<any> {
    return data.map((element: any) => ({
      latitud: Number(element.lat),
      longitud: Number(element.lon),
      velocidad: element.velocidad,
      orientacion: element.direccion,
      fecha_emv: format(new Date(element.time), 'dd/MM/yyyy HH:mm:ss'),
      placa_vehiculo: element.placa,
      id_evento: 1,
    }));
  }

  async sendDataToMtc(data: Array<any>) {
    try {
      const token = await this.refreshToken();
      const response = await lastValueFrom(
        this.httpService
          .post('http://78.46.16.8:3700/api/transmissions', data, {
            headers: { 'x-access-token': token },
          })
          .pipe(map((resp) => resp.data)),
      );
      this.logger.verbose(`sendDataToMTC => ${response.message}`);
    } catch (error) {
      this.setNewTokenInCache();
    }
  }

  async refreshToken(): Promise<string> {
    const token = await this.cacheManager.get('token');
    if (!token) {
      return this.setNewTokenInCache();
    } else {
      return token as string;
    }
  }

  async setNewTokenInCache(): Promise<string> {
    const data = await lastValueFrom(
      this.httpService
        .post('http://78.46.16.8:3700/api/users/login', {
          usuario: '20455456445',
          contrasena: 'K$XwiOp^^DkS',
        })
        .pipe(map((resp) => resp.data)),
    );
    await this.cacheManager.set('token', data.token, { ttl: 0 });
    return data.token;
  }
}
