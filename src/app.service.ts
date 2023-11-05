import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ChannelType, Client, Events, TextBasedChannel } from 'discord.js';
import { MatchDto } from './dto/match.dto';
import WebSocket from 'ws';

@Injectable()
export class AppService {
  private readonly reg: RegExp = /^\d+$/;
  constructor(
    @InjectDiscordClient()
    public client: Client,
    public httpService: HttpService,
  ) {
    this.onMessageFinalizer();
  }
  getHello(): string {
    return '¡Generado!';
  }

  async onMessageFinalizer(): Promise<void> {
    this.client.on(Events.MessageCreate, async (message) => {
      if (
        message.channel.type == ChannelType.GuildText &&
        message.channel.name.startsWith(
          (process.env.QUEUE_NAME || 'queue') + '-',
        ) &&
        message.content.length >= 10 &&
        this.reg.test(message.content)
      ) {
        const matchNum = +message.channel.name.split('-')[1];
        const match = await firstValueFrom(
          this.httpService.get<MatchDto>(
            'https://americas.api.riotgames.com/lol/match/v5/matches/LA2_' +
              message.content +
              '?api_key=' +
              process.env.RIOT_API_KEY,
          ),
        );
        if (match.status == 200) {
          const matchData: MatchDto = match.data;
          let winner: number;
          if (matchData.info.teams[0].win) {
            winner = 0;
          } else {
            winner = 1;
          }
          const dataFinal = {
            match_number: matchNum,
            winner: winner,
          };
          this.httpService
            .post('https://api.neatqueue.com/api/outcome/winner', dataFinal, {
              headers: {
                Accept: 'application/json',
                Authorization: process.env.NEAT_API_KEY,
                'Content-Type': 'application/json',
              },
            })
            .subscribe({
              next: () => {
                console.log(
                  'Partida ' +
                    matchNum +
                    ' finalizada con el equipo ' +
                    winner +
                    ' como ganador.',
                );
              },
              error: (err: AxiosError) => {
                console.log(err.response.statusText);
              },
            });
        }
      }
    });
  }

  async getDraftLol(channel: string, matchNumber: number): Promise<string> {
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
      const messageTwo =
        'Crear partida personalizada con la siguiente configuración:' +
        '\nNombre: ' +
        process.env.NAME_QUEUE +
        matchNumber +
        '\nContraseña: ' +
        process.env.PASSWORD_QUEUE +
        matchNumber;
      //embeds: [{ title: 'In-House Draft', description: message }],
      this.client.channels.fetch(channel).then((channelFetched) => {
        const text = channelFetched as TextBasedChannel;
        text.send({
          embeds: [
            { title: 'In-House Draft', description: message, color: 15548997 },
          ],
        });
        text.send({
          embeds: [
            {
              title: 'In-House Instrucciones',
              description: messageTwo,
              color: 15548997,
            },
          ],
        });
      });
    });

    return await new Promise((r) => setTimeout(r, 2000)).then(() => {
      return '¡Generado!';
    });
  }
}
