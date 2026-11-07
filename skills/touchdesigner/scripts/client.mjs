#!/usr/bin/env node

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 44444;
const DEFAULT_TIMEOUT_MS = 10000;

const USAGE = `TouchDesigner local HTTP client

Usage:
  node scripts/client.mjs ping [--host HOST] [--port PORT]
  node scripts/client.mjs pane [--host HOST] [--port PORT]
  node scripts/client.mjs selection [--host HOST] [--port PORT]
  node scripts/client.mjs operators [PATH] [--host HOST] [--port PORT]
  node scripts/client.mjs execute [--from OP_PATH] [--quiet]
  node scripts/client.mjs params TARGET [--match PATTERN] [--changed] [--full]
  node scripts/client.mjs inspect OP_PATH
  node scripts/client.mjs network [PATH] [--depth N]
  node scripts/client.mjs audit OP_PATH [--max-expression-length N] [--baseline FILE]
  node scripts/client.mjs info OP_TYPE
  node scripts/client.mjs errors [OP_PATH]

Environment:
  TDAPI_HOST        default: localhost
  TDAPI_PORT        default: 44444
  TDAPI_TIMEOUT_MS  default: 10000

Notes:
  execute reads Python from stdin. It writes input diagnostics to stderr by default.
  Use --quiet to suppress diagnostics.
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
    if (error instanceof TypeError) {
      throw new Error(`Failed to connect to ${config.baseUrl}: ${error.message}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

function parseNonNegativeInteger(value, label) {
  if (value === true || value === "" || value === undefined || value === null) {
    throw new Error(`${label} requires a value.`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
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
    throw new Error("--code was removed. Pipe Python code through stdin instead.");
  }
  if (options.file !== undefined) {
    throw new Error("--file was removed. Pipe Python code through stdin instead.");
  }

  if (process.stdin.isTTY) {
    throw new Error("Provide Python code on stdin.");
  }

  const code = await readStdin();
  if (code.length === 0) {
    throw new Error("No Python code received on stdin.");
  }
  return code;
}

function printJson(value, compact) {
  process.stdout.write(`${JSON.stringify(value, null, compact ? 0 : 2)}\n`);
}

function pythonString(value) {
  return JSON.stringify(String(value));
}

async function sha256(text) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function lineCount(text) {
  if (text.length === 0) {
    return 0;
  }
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withoutFinalNewline = normalized.endsWith("\n")
    ? normalized.slice(0, -1)
    : normalized;
  return withoutFinalNewline.length === 0 ? 1 : withoutFinalNewline.split("\n").length;
}

async function writeInputDiagnostics(code, fromOp, quiet) {
  if (quiet) {
    return;
  }

  const bytes = Buffer.byteLength(code, "utf8");
  const chars = Array.from(code).length;
  const lines = lineCount(code);
  const hash = await sha256(code);
  process.stderr.write(
    `touchdesigner input: source=stdin from=${fromOp} bytes=${bytes} chars=${chars} lines=${lines} sha256=${hash}\n`
  );
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
  const compact = Boolean(options.compact);

  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return;
  }

  const config = getConfig(options);

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
    await writeInputDiagnostics(code, fromOp, Boolean(options.quiet));
    printJson(await executePython(config, code, fromOp), compact);
    return;
  }

  if (command === "params") {
    const target = positional[0];
    if (!target) {
      throw new Error("params requires an operator type or path, e.g. sphereSOP or /project1/geo1.");
    }
    const query = buildQuery({
      target,
      match: options.match,
      changed: Boolean(options.changed),
      full: Boolean(options.full),
    });
    printJson(await requestJson(config, `/params${query}`), compact);
    return;
  }

  if (command === "inspect") {
    const path = positional[0];
    if (!path) {
      throw new Error("inspect requires an operator path, e.g. /project1/geo1.");
    }
    printJson(await requestJson(config, `/inspect${buildQuery({ path })}`), compact);
    return;
  }

  if (command === "network") {
    const path = String(options.path ?? positional[0] ?? "/");
    const depth = parseNonNegativeInteger(options.depth ?? 1, "depth");
    printJson(await requestJson(config, `/network${buildQuery({ path, depth })}`), compact);
    return;
  }

  if (command === "audit") {
    const path = positional[0];
    if (!path) throw new Error("audit requires an explicit operator path.");
    const limit = parseNonNegativeInteger(options["max-expression-length"] ?? 70, "max-expression-length");
    let result = await requestJson(config, `/audit${buildQuery({ path, max_expression_length: limit })}`);
    if (options.baseline !== undefined) {
      if (typeof options.baseline !== "string") throw new Error("baseline requires a file.");
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(options.baseline);
      const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf16le" : "utf8";
      const baseline = JSON.parse(bytes.toString(encoding).replace(/^\uFEFF/, ""));
      const { compareAudits } = await import('./audit-comparison.mjs');
      result = compareAudits(result, baseline);
    }
    printJson(result, compact);
    if (!result.complete) process.exitCode = 2;
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
