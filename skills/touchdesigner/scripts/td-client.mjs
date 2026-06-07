#!/usr/bin/env node

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 44444;
const DEFAULT_TIMEOUT_MS = 10000;

const USAGE = `TouchDesigner local HTTP client

Usage:
  node scripts/td-client.mjs ping [--host HOST] [--port PORT]
  node scripts/td-client.mjs pane [--host HOST] [--port PORT]
  node scripts/td-client.mjs selection [--host HOST] [--port PORT]
  node scripts/td-client.mjs operators [PATH] [--host HOST] [--port PORT]
  node scripts/td-client.mjs execute [--from OP_PATH] [--code CODE | --file FILE]
  node scripts/td-client.mjs params OP_TYPE
  node scripts/td-client.mjs info OP_TYPE
  node scripts/td-client.mjs errors [OP_PATH]

Environment:
  TDAPI_HOST        default: localhost
  TDAPI_PORT        default: 44444
  TDAPI_TIMEOUT_MS  default: 10000
`;

function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }

  return { options, positional };
}

function requireFetch() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node.js 18 or later because it uses global fetch().");
  }
}

function getConfig(options) {
  const host = String(options.host ?? process.env.TDAPI_HOST ?? DEFAULT_HOST);
  const port = Number(options.port ?? process.env.TDAPI_PORT ?? DEFAULT_PORT);
  const timeoutMs = Number(options.timeout ?? process.env.TDAPI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${options.port ?? process.env.TDAPI_PORT}`);
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid timeout: ${options.timeout ?? process.env.TDAPI_TIMEOUT_MS}`);
  }

  return {
    baseUrl: `http://${host}:${port}`,
    timeoutMs,
  };
}

async function requestJson(config, path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
    }

    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Timed out after ${config.timeoutMs}ms connecting to ${config.baseUrl}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readCode(options) {
  if (options.code !== undefined) {
    return String(options.code);
  }

  if (options.file !== undefined) {
    const { readFile } = await import("node:fs/promises");
    return readFile(String(options.file), "utf8");
  }

  if (process.stdin.isTTY) {
    throw new Error("Provide Python code with --code, --file, or stdin.");
  }

  return readStdin();
}

function printJson(value, compact) {
  process.stdout.write(`${JSON.stringify(value, null, compact ? 0 : 2)}\n`);
}

function pythonString(value) {
  return JSON.stringify(String(value));
}

async function executePython(config, code, fromOp) {
  const suffix = fromOp && fromOp !== "/" ? `?from_op=${encodeURIComponent(fromOp)}` : "";
  return requestJson(config, `/execute${suffix}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: code,
  });
}

async function main() {
  requireFetch();

  const [commandRaw, ...rest] = process.argv.slice(2);
  const command = commandRaw ?? "help";
  const { options, positional } = parseArgs(rest);
  const config = getConfig(options);
  const compact = Boolean(options.compact);

  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return;
  }

  if (command === "ping") {
    await requestJson(config, "/editor/pane");
    printJson({ success: true, baseUrl: config.baseUrl }, compact);
    return;
  }

  if (command === "pane") {
    printJson(await requestJson(config, "/editor/pane"), compact);
    return;
  }

  if (command === "selection") {
    printJson(await requestJson(config, "/editor/selection"), compact);
    return;
  }

  if (command === "operators") {
    const path = String(options.path ?? positional[0] ?? "/");
    printJson(await requestJson(config, `/operators?path=${encodeURIComponent(path)}`), compact);
    return;
  }

  if (command === "execute") {
    const code = await readCode(options);
    const fromOp = String(options.from ?? options["from-op"] ?? "/");
    printJson(await executePython(config, code, fromOp), compact);
    return;
  }

  if (command === "params") {
    const opType = positional[0];
    if (!opType) {
      throw new Error("params requires an operator type, e.g. sphereSOP.");
    }
    const code = [
      "import json",
      `print(json.dumps(op.TDAPI.GetParameterList(${pythonString(opType)}), ensure_ascii=False))`,
    ].join("\n");
    printJson(await executePython(config, code, "/"), compact);
    return;
  }

  if (command === "info") {
    const opType = positional[0];
    if (!opType) {
      throw new Error("info requires an operator type, e.g. sphereSOP.");
    }
    const code = [
      "import json",
      `print(json.dumps(op.TDAPI.GetOperatorInfo(${pythonString(opType)}), ensure_ascii=False))`,
    ].join("\n");
    printJson(await executePython(config, code, "/"), compact);
    return;
  }

  if (command === "errors") {
    const path = String(options.path ?? positional[0] ?? "/");
    const code = [
      `target = op(${pythonString(path)})`,
      "target.cook(force=True)",
      "print(op.TDAPI.CheckErrors(target, recurse=True))",
    ].join("\n");
    printJson(await executePython(config, code, path), compact);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${USAGE}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
