import { writeFileSync } from "fs";
import { render } from "./makefile";
import { typescriptProvider } from "./makefile-builders";

function main() {
  const makefile = typescriptProvider("awsx", {
    goDir: "schemagen",
    providerDir: "awsx",
    schemaDir: "awsx",
  });
  writeFileSync("Makefile", render(makefile), { encoding: "utf-8" });
}

main();
