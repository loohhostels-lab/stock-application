import fs from "node:fs";
import path from "node:path";

import { document } from "./openapi";

const outputPath = path.join(
    process.cwd(),
    "openapi.json"
);

fs.writeFileSync(
    outputPath,
    JSON.stringify(document, null, 2)
);

console.log("OpenAPI spec generated → openapi.json");
