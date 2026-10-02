import * as vscode from 'vscode';

export const outputChannel = vscode.window.createOutputChannel(
  'Definition Extension'
);

export function logRequest(method: string, url: string): number {
  outputChannel.appendLine(`--> ${method} ${url}`);
  return Date.now();
}

export function logResponse(
  method: string,
  url: string,
  status: number,
  startedAt: number
): void {
  outputChannel.appendLine(
    `<-- ${method} ${url} ${status} (${Date.now() - startedAt}ms)`
  );
}

export function logError(
  method: string,
  url: string,
  err: unknown,
  startedAt: number
): void {
  outputChannel.appendLine(
    `xxx ${method} ${url} failed after ${Date.now() - startedAt}ms: ${(err as Error).message}`
  );
}

export function logMessage(message: string): void {
  outputChannel.appendLine(message);
}

const MAX_BODY_LENGTH = 2000;

/** Logs a failed response's body, truncated so large payloads don't flood the channel. */
export function logErrorBody(body: unknown): void {
  let text: string;
  if (typeof body === 'string') {
    text = body;
  } else {
    try {
      text = JSON.stringify(body);
    } catch {
      text = String(body);
    }
  }
  outputChannel.appendLine(`    error body: ${text.slice(0, MAX_BODY_LENGTH)}`);
}
