const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

const useColor = process.stderr.isTTY;

function fmt(color, msg) {
  return useColor ? `${color}${msg}${RESET}` : msg;
}

export function info(msg) {
  process.stderr.write(`${fmt(DIM, "s3pull")} ${msg}\n`);
}

export function success(msg) {
  process.stderr.write(`${fmt(GREEN, "s3pull")} ${msg}\n`);
}

export function warn(msg) {
  process.stderr.write(`${fmt(YELLOW, "s3pull")} ${msg}\n`);
}

export function error(msg) {
  process.stderr.write(`${fmt(RED, "s3pull")} ${msg}\n`);
}
