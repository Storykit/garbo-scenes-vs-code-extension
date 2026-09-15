import * as http from 'node:http';

export interface CallbackResult {
  code: string;
  state: string | null;
}

/**
 * Starts a one-shot HTTP server on a fixed loopback port to receive the
 * Auth0 authorization redirect (?code=...&state=...), then closes. The port
 * is fixed (rather than OS-assigned) so it can be registered as an exact
 * Allowed Callback URL in the Auth0 dashboard.
 */
export function waitForCallback(port: number, timeoutMs = 120_000): Promise<{ result: Promise<CallbackResult> }> {
  return new Promise((resolveStart, rejectStart) => {
    const server = http.createServer();

    const result = new Promise<CallbackResult>((resolveResult, rejectResult) => {
      const timer = setTimeout(() => {
        server.close();
        rejectResult(new Error('Sign-in timed out waiting for redirect.'));
      }, timeoutMs);

      server.on('request', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const error = url.searchParams.get('error_description') ?? url.searchParams.get('error');
        const code = url.searchParams.get('code');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(error);
          clearTimeout(timer);
          server.close();
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

        clearTimeout(timer);
        server.close();
        resolveResult({ code, state: url.searchParams.get('state') });
      });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        rejectStart(new Error(`Port ${port} is already in use. Close any other in-progress sign-in and try again.`));
      } else {
        rejectStart(err);
      }
    });
    server.listen(port, '127.0.0.1', () => resolveStart({ result }));
  });
}
