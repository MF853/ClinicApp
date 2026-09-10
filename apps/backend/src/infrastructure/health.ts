import {Controller,Get,ServiceUnavailableException} from '@nestjs/common';
import {db} from './db.js';
@Controller('health')
export class HealthController {
 @Get('live') live(){return {status:'ok'};}
 @Get('ready') async ready(){try{await db.$queryRaw`SELECT 1`;return {status:'ready'};}catch{throw new ServiceUnavailableException('Banco de dados indisponível.');}}
}
