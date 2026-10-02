import * as http from 'node:http';

export interface CallbackResult {
  code: string;
  state: string | null;
}

/** Cancels the in-progress sign-in, if any, and resolves once its port is released. */
let cancelActive: (() => Promise<void>) | undefined;

/**
 * Starts a one-shot HTTP server on a fixed loopback port to receive the
 * Auth0 authorization redirect (?code=...&state=...), then closes. The port
 * is fixed (rather than OS-assigned) so it can be registered as an exact
 * Allowed Callback URL in the Auth0 dashboard. Starting a new wait cancels
 * any earlier one, so an abandoned sign-in never blocks the port.
 */
export async function waitForCallback(
  port: number,
  timeoutMs = 120_000
): Promise<{ result: Promise<CallbackResult> }> {
  await cancelActive?.();

  return new Promise((resolveStart, rejectStart) => {
    const server = http.createServer();
    let timer: NodeJS.Timeout | undefined;
    let resolveResult!: (value: CallbackResult) => void;
    let rejectResult!: (reason: Error) => void;
    const result = new Promise<CallbackResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    const shutdown = () =>
      new Promise<void>((resolve) => {
        clearTimeout(timer);
        if (cancelActive === cancel) {
          cancelActive = undefined;
        }
        server.close(() => resolve());
        server.closeAllConnections();
      });

    const cancel = async () => {
      const closed = shutdown();
      rejectResult(
        new Error('Sign-in cancelled because a new sign-in was started.')
      );
      await closed;
    };

    server.on('request', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url ?? '/', 'http://localhost');
      const error =
        url.searchParams.get('error_description') ??
        url.searchParams.get('error');
      const code = url.searchParams.get('code');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(error);
        void shutdown();
        rejectResult(new Error(error));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing code.');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Signed in. You can close this tab and return to VS Code.');

      void shutdown();
      resolveResult({ code, state: url.searchParams.get('state') });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        rejectStart(
          new Error(
            `Port ${port} is already in use by another program. Free it or change the callback port setting.`
          )
        );
      } else {
        rejectStart(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      // Only arm the timeout and register for cancellation once the server is
      // actually listening, so a failed start leaves nothing behind.
      timer = setTimeout(() => {
        void shutdown();
        rejectResult(new Error('Sign-in timed out waiting for redirect.'));
      }, timeoutMs);
      cancelActive = cancel;
      resolveStart({ result });
    });
  });
}
