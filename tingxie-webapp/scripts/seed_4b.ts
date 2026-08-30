import { importStructuredUnits } from "../app/actions/import";
import fs from "fs";
import path from "path";

async function main() {
  const jsonPath = path.join(__dirname, "../data/extracted_4b.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("extracted_4b.json not found!");
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const units = JSON.parse(raw);

  console.log(`Importing ${units.length} units into database...`);
  const res = await importStructuredUnits(units);
  console.log("Import result:", res);
}

main().catch(console.error);
