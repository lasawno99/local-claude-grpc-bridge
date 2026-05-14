# Local Claude gRPC Bridge

Local Claude gRPC bridge with UI automation and Telegram alerts.

This scaffold runs a local frontend, HTTP backend, gRPC server, and gRPC client on your machine. The local gRPC server forwards generation requests to Anthropic's Claude Messages API over HTTP.

It uses runtime proto loading through Node dependencies, so no global `protoc` compiler is required.

## Architecture

```text
Frontend browser
  -> POST /api/generate
Local Node backend
  -> local gRPC ModelService.Generate
Local gRPC server
  -> POST https://api.anthropic.com/v1/messages
Claude API
```

The local process starts a gRPC server on `LOCAL_GRPC_PORT`, so other local tools can call the same `ModelService` facade.

## Configure

Copy `.env.example` to `.env` and set your Anthropic API key:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5
ANTHROPIC_MAX_TOKENS=1024
```

The default API URL is `https://api.anthropic.com/v1/messages`, and the default Anthropic API version header is `2023-06-01`.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

In another terminal, test the local gRPC service directly:

```bash
npm run client -- "Write a one-sentence explanation of gRPC."
```

## Local automation and GUI testing

This project also includes a self-contained automation setup:

- Token Optimizer MCP is installed as a local dependency through `@ooples/token-optimizer-mcp`.
- UI-TARS is installed locally through `@ui-tars/sdk` and `@ui-tars/operator-nut-js`.
- Telegram alerts use the Bot API directly through Node's built-in `fetch`, so no global Telegram tool is required.

Check the Token Optimizer MCP local config:

```bash
npm run token-optimizer:config
```

Start the local MCP server:

```bash
npm run token-optimizer:start
```

The MCP config lives at `mcp/token-optimizer.mcp.json` and points at the package inside `node_modules`.

Run the UI-TARS smoke test in safe dry-run mode:

```bash
npm run gui:test -- "Open the local app and verify the prompt form is visible."
```

Dry-run mode verifies that the UI-TARS packages load and writes `automation/latest-ui-tars-report.json`. It does not control your computer.

To run a real GUI automation session, configure:

```env
UI_TARS_ENABLE_LIVE=true
UI_TARS_BASE_URL=http://127.0.0.1:8000/v1
UI_TARS_API_KEY=local-ui-tars-key
UI_TARS_MODEL=ui-tars
```

Then run:

```bash
npm run gui:test:live -- "Open http://127.0.0.1:3000 and verify the prompt form is visible."
```

## Telegram alerts

Create a Telegram bot with BotFather, then set these values in `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:your-token
TELEGRAM_CHAT_ID=123456789
```

Send a test alert:

```bash
npm run telegram:test
```

Run the simple polling bot:

```bash
npm run telegram:bot
```

Supported bot commands:

- `/status` replies that the local bot is running.
- `/test` runs the local automation checks and sends the result back to Telegram.

## Automation checks

Run all local smoke checks:

```bash
npm run test:automation
```

This checks server/client syntax, Token Optimizer MCP local installation, and the UI-TARS dry-run path. If Telegram is configured, the summary is sent as an alert.

## gRPC contract

The shared contract is in `protos/model.proto`:

```proto
service ModelService {
  rpc Generate (GenerateRequest) returns (GenerateResponse);
}
```

Update this file if you want to expose more Claude request options through gRPC, then keep the request mapping in `server/index.js`, `server/grpcServer.js`, and `server/anthropicClient.js` aligned with it.
