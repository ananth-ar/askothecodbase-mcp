import { main } from "./src/opencode-edit.ts";
main().catch((err) => {
  console.error("SDK edit demo failed:", err);
  process.exit(1);
});
