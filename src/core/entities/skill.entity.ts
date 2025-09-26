export class Skill {
  id: bigint;
  name: string;

  constructor({ id, name }: { id: bigint; name: string }) {
    this.id = id;
    this.name = name;
  }
}
