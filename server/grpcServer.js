import { generateWithClaude } from "./anthropicClient.js";
import { grpc, modelProto } from "./proto.js";

export function startLocalGrpcServer() {
  const port = Number(process.env.LOCAL_GRPC_PORT || 50051);
  const host = process.env.LOCAL_GRPC_HOST || "127.0.0.1";
  const server = new grpc.Server();

  server.addService(modelProto.ModelService.service, {
    async generate(call, callback) {
      try {
        const response = await generateWithClaude(call.request);
        callback(null, response);
      } catch (error) {
        callback({
          code: grpc.status.UNAVAILABLE,
          message: error.message || "Claude API request failed."
        });
      }
    }
  });

  server.bindAsync(
    `${host}:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        throw error;
      }

      console.log(`Local gRPC server listening on ${host}:${boundPort}`);
    }
  );

  return server;
}
