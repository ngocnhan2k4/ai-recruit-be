import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>("MAIL_HOST"),
          port: 587,
          secure: false,
          auth: {
            user: configService.get<string>("MAIL_USER"),
            pass: configService.get<string>("MAIL_PASSWORD"),
          },
        },
        defaults: {
          from: configService.get<string>("MAIL_FROM"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
