import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import {
  ChannelType,
  Client,
  Events,
  Routes,
  TextBasedChannel,
} from 'discord.js';
import { MatchDto } from './dto/match.dto';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';

@Injectable()
export class AppService {
  private readonly reg: RegExp = /^\d+$/;
  constructor(
    @InjectDiscordClient()
    public client: Client,
    public httpService: HttpService,
  ) {
    this.onMessageFinalizer();
    this.newGuild();
    this.commandPing();
  }

  commandPing(): void {
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName != 'ping') {
        console.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }
      try {
        await interaction.reply('Pong!');
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'Hubo un error al ejecutar este comando!',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: 'Hubo un error al ejecutar este comando!',
            ephemeral: true,
          });
        }
      }
    });
  }

  newGuild(): void {
    this.client.on(Events.GuildAvailable, (guild) => {
      this.generateCommands(guild.id, this.client.application.id);
    });
  }

  async generateCommands(guildId: string, botId: string): Promise<void> {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs
      .readdirSync(foldersPath)
      .filter((file) => file.endsWith('.js'));

    for (const file of commandFolders) {
      const filePath = path.join(foldersPath, file);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      }
    }
    try {
      if (guildId) {
        await this.client.rest.put(
          Routes.applicationGuildCommands(botId, guildId),
          { body: commands },
        );
      }
    } catch (error) {
      console.error(error);
    }
  }
  getHello(): string {
    return '¡Generado!';
  }

  async onMessageFinalizer(): Promise<void> {
    this.client.on(Events.MessageCreate, async (message) => {
      if (
        message.channel.type == ChannelType.GuildText &&
        message.channel.name.startsWith(process.env.QUEUE_NAME + '-') &&
        message.content.length >= 10 &&
        this.reg.test(message.content)
      ) {
        const matchNum = Number(message.channel.name.split('-')[1]);
        const matchServer = message.guild.id;
        this.httpService
          .get<MatchDto>(
            'https://americas.api.riotgames.com/lol/match/v5/matches/LA2_' +
              message.content +
              '?api_key=' +
              process.env.RIOT_API_KEY,
          )
          .subscribe({
            next: (match) => {
              if (match.status == 200) {
                const matchData: MatchDto = match.data;
                let winner: number;
                if (matchData.info.teams[0].win) {
                  winner = 1;
                } else {
                  winner = 2;
                }
                const dataFinal = {
                  server_id: matchServer,
                  match_number: matchNum,
                  team_num: winner,
                };
                this.httpService
                  .post(
                    'https://api.neatqueue.com/api/outcome/winner',
                    dataFinal,
                    {
                      headers: {
                        Authorization: process.env.NEAT_API_KEY,
                      },
                    },
                  )
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
                    error: () => {
                      console.log(
                        'Ocurrió un error al finalizar la partida numero ' +
                          matchNum,
                      );
                    },
                  });
              }
            },
            error: () => {
              console.log('El código de partida no es valido');
            },
          });
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
        '\nContraseña: 12345';
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
