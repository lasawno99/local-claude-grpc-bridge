import "dotenv/config";
import express from "express";
import cors from "cors";
import { startLocalGrpcServer } from "./grpcServer.js";
import { grpc, modelProto } from "./proto.js";

const app = express();
const httpPort = Number(process.env.HTTP_PORT || 3000);
const httpHost = process.env.HTTP_HOST || "127.0.0.1";
const localGrpcPort = Number(process.env.LOCAL_GRPC_PORT || 50051);
const localGrpcHost = process.env.LOCAL_GRPC_HOST || "127.0.0.1";
const localGrpcClient = new modelProto.ModelService(
  `${localGrpcHost}:${localGrpcPort}`,
  grpc.credentials.createInsecure()
);

function generateOverLocalGrpc(request) {
  return new Promise((resolve, reject) => {
    localGrpcClient.generate(request, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static("frontend"));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    httpHost,
    localGrpcTarget: `${localGrpcHost}:${localGrpcPort}`,
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"
  });
});

app.post("/api/generate", async (request, response) => {
  const prompt = String(request.body?.prompt || "").trim();

  if (!prompt) {
    response.status(400).json({ error: "Prompt is required." });
    return;
  }

  try {
    const result = await generateOverLocalGrpc({
      prompt,
      sessionId: request.body?.sessionId || "local-ui",
      system: request.body?.system || ""
    });

    response.json(result);
  } catch (error) {
    response.status(502).json({
      error: "Local gRPC request failed.",
      detail: error.message
    });
  }
});

startLocalGrpcServer();

app.listen(httpPort, httpHost, () => {
  console.log(`Frontend and HTTP backend listening on http://${httpHost}:${httpPort}`);
});
