import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/draft')
  async getHello(@Body() body): Promise<string> {
    if (body['action'] == 'MATCH_STARTED') {
      return this.appService.getDraftLol(body['channel']);
    } else {
      return '¡Evento incorrecto!';
    }
  }
}
