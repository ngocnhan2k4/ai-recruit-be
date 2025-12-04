import { OtpEntity } from "../entities";

export abstract class IOtpStorageService {
  abstract store(key: string, otp: OtpEntity): Promise<void>;

  abstract get(key: string): Promise<OtpEntity | null>;

  abstract delete(key: string): Promise<void>;
}
