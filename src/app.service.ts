import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { Client, TextBasedChannel } from 'discord.js';
import WebSocket from 'ws';

@Injectable()
export class AppService {
  constructor(
    @InjectDiscordClient()
    public client: Client,
  ) {}
  getHello(): string {
    return '¡Generado!';
  }

  async getDraftLol(channel: string): Promise<string> {
    const ws = new WebSocket('wss://draftlol.dawe.gg/');
    ws.addEventListener('open', () => {
      const data = {
        type: 'createroom',
        blueName: 'In-House Queue Blue',
        redName: 'In-House Queue Red',
        disabledTurns: [],
        disabledChamps: [],
        timePerPick: '30',
        timePerBan: '30',
      };
      ws.send(JSON.stringify(data));
    });
    ws.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data as string);
      const message =
        '🔵 https://draftlol.dawe.gg/' +
        data['roomId'] +
        '/' +
        data['bluePassword'] +
        '\n🔴 https://draftlol.dawe.gg/' +
        data['roomId'] +
        '/' +
        data['redPassword'] +
        '\n👁️ https://draftlol.dawe.gg/' +
        data['roomId'];
      //embeds: [{ title: 'In-House Draft', description: message }],
      this.client.channels.fetch(channel).then((channelfetched) => {
        const text = channelfetched as TextBasedChannel;
        text.send({
          embeds: [{ title: 'In-House Draft', description: message }],
        });
      });
    });

    return await new Promise((r) => setTimeout(r, 2000)).then(() => {
      return '¡Generado!';
    });
  }
}
