import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/draft')
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  async getHello(@Body() body: any): Promise<string> {
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    if (body['action'] === 'MATCH_STARTED') {
      // biome-ignore lint/complexity/useLiteralKeys: <explanation>
      return this.appService.getDraftLol(body['channel'], body['match_number']);
    }
    return '¡Evento incorrecto!';
  }
}
