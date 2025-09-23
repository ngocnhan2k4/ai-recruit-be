import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { JobFactoryService } from "./job-factory.service";

@Injectable()
export class JobUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly jobFactoryService: JobFactoryService,
  ) {}
}
