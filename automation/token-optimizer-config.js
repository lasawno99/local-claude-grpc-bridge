import path from "node:path";
import { existsSync } from "node:fs";

const serverPath = path.resolve("node_modules/@ooples/token-optimizer-mcp/dist/server/index.js");
const configPath = path.resolve("mcp/token-optimizer.mcp.json");

if (!existsSync(serverPath)) {
  console.error("Token Optimizer MCP is not installed. Run npm install first.");
  process.exit(1);
}

console.log("Token Optimizer MCP is installed locally.");
console.log(`MCP config: ${configPath}`);
console.log("Start it with: npm run token-optimizer:start");
