import "dotenv/config";
import { grpc, modelProto } from "../server/proto.js";

const port = Number(process.env.LOCAL_GRPC_PORT || 50051);
const host = process.env.LOCAL_GRPC_HOST || "127.0.0.1";
const prompt = process.argv.slice(2).join(" ").trim() || "Say hello from Claude over local gRPC.";

const client = new modelProto.ModelService(
  `${host}:${port}`,
  grpc.credentials.createInsecure()
);

client.generate(
  {
    prompt,
    sessionId: "local-cli",
    system: "You are concise and helpful."
  },
  (error, response) => {
    if (error) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }

    console.log(response.text);
    console.log(`\nmodel=${response.model} stop_reason=${response.stopReason}`);
  }
);
