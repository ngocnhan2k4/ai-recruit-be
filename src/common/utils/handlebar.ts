import { readFileSync } from "fs";
import { join, resolve } from "path";
import Handlebars from "handlebars";

export const compileTemplate = (filename: string, data: any) => {
  const __dirname = resolve();
  const template = readFileSync(
    join(__dirname, "/src/common/templates", filename),
    "utf8",
  );
  return Handlebars.compile(template)(data);
};
