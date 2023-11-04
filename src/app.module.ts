import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiscordModule } from '@discord-nestjs/core';
import { GatewayIntentBits } from 'discord.js';

@Module({
  imports: [
    HttpModule,
    DiscordModule.forRootAsync({
      useFactory: () => ({
        token:
          process.env.BOT_TOKEN ||
          'MTE2MjcyMjY2MTI3NzkxMzE4OA.GCS5EA.hOkUR795xXlR7hOs6HAwpWDnAEeVakQvrBmFTo',
        discordClientOptions: {
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
          ],
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
