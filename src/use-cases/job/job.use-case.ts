import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";

@Injectable()
export class JobUseCases {
  constructor(private readonly dataServices: IDataServices) {}
}
