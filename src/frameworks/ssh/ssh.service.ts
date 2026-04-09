import { Injectable, Logger } from "@nestjs/common";
import { Client } from "ssh2";

export interface SshConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface SshCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  async execCommand(
    config: SshConnectionConfig,
    command: string,
  ): Promise<SshCommandResult> {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on("ready", () => {
        this.logger.log(
          `SSH connected to ${config.host}, executing: ${command}`,
        );

        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          let stdout = "";
          let stderr = "";

          stream.on("close", (code: number) => {
            conn.end();
            this.logger.log(`Command exited with code ${code}`);
            resolve({ stdout, stderr, code });
          });

          stream.on("data", (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
          });
        });
      });

      conn.on("error", (err) => {
        this.logger.error(`SSH connection error to ${config.host}`, err);
        reject(err);
      });

      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
      });
    });
  }
}
