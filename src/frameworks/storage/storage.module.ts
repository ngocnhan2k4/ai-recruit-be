import { Module } from "@nestjs/common";
import { FirebaseStorageService } from "./firebase-storage.service";
import { FireBaseAuthServicesModule } from "../auth-services/firebase/firebase-auth-services.module";

@Module({
  imports: [FireBaseAuthServicesModule],
  providers: [FirebaseStorageService],
  exports: [FirebaseStorageService],
})
export class StorageModule {}
