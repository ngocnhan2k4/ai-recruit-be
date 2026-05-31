import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

@Injectable()
export class ContextStorage {
  private readonly als = new AsyncLocalStorage<Map<string, any>>();

  run(fn: () => void) {
    this.als.run(new Map(), fn);
  }

  set(key: string, value: any) {
    this.als.getStore()?.set(key, value);
  }

  get(key: string) {
    return this.als.getStore()?.get(key);
  }

  getAll() {
    return this.als.getStore();
  }
}
