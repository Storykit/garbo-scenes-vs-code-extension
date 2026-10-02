# Definition Extension

VS Code extension for working with slide definitions in [garbo-scenes](https://github.com/Storykit/garbo-scenes). It signs in to Storykit through Auth0, fetches definitions from CWS, and writes them into the scene directories as JSON.

## Local development

### Setup

Run `npm install`.

Sign-in redirects through the admin app, so admin must be running locally (see [Authentication](#authentication)). Start it from dolly with `npm run start` in `apps/admin`. It serves on `http://localhost:4201/`.

### Run the extension

Open this project in VS Code and press `F5` (**Run Extension**). This compiles the extension and opens an Extension Development Host window. Open the garbo-scenes repo in that window. The extension works on the first workspace folder.

Run `npm run watch` to rebuild on change, then reload the Extension Development Host window (`Developer: Reload Window`) to pick up the new code.

### Build

Run `npm run compile` to bundle the extension with esbuild. The output is `dist/extension.js`. esbuild does not check types, so run `npm run typecheck` (`tsc --noEmit`) as well. The default build task (`F5`) and `npm run package` run both.

Run `npm run package` to build a `.vsix`. This requires [vsce](https://github.com/microsoft/vscode-vsce) (`npm i -g @vscode/vsce`).

### Lint

Run `npm run lint`. Use `npm run lint:fix` to apply auto-fixes.

### Format

Run `npm run format` to check formatting with Prettier, or `npm run format:fix` to rewrite the files. The config follows dolly's (`apps/admin`, `apps/kit-editorials`).

## Usage

The extension adds a **Definition Extension** view to the activity bar. Choose **Stage** or **Production**, sign in, and then run one of these operations:

| Operation | Reads | Writes |
|---|---|---|
| Export definition | Definition from CWS | `dataSchema.json`, `uiSchema.json` |
| Export variables | Definition from CWS | `definition_values.json` |
| Generate data | Local `dataSchema.json` | `data.json` |

Each operation targets a single scene directory. Enter its name in the **Definition type name** field, or leave the field empty to use the directory of the file open in the editor. Directory names match definition type names in CWS.

- **All top-level directories** runs the operation on every scene directory. It skips hidden directories, `node_modules`, `00_TEMPLATE`, `01_LOCAL_BACKGROUND`, `background` and `shared_modules`. If one directory fails, the rest still run.
- **Only write if empty** skips files that already have content. Turn it off to overwrite them.

JSON is written with 4-space indentation and no trailing newline, which is the dominant style in garbo-scenes (~90%).

Request and response logs are available through the command **Definition Extension: Show Request Logs**.

## Architecture

### Code structure

- **src**: Extension source. The entry point and the modules shared across directories (environments, logging) sit at the top level.
  - **auth**: Auth0 sign-in, token refresh and token storage.
  - **api**: Communication with CWS.
  - **operations**: What the view's buttons do, independent of the UI.
  - **workspace**: Reading and writing files and directories in the open workspace.
  - **webview**: The sidebar view and its message handling.
- **media**
  - **webview**: HTML, CSS and JS for the view, with one folder per state (`loginForm`, `signedIn`).

## Environment configuration

Each environment has its own settings under `definitionExtension.stage.*` and `definitionExtension.production.*`. The defaults are in `contributes.configuration` in `package.json`, and you can override them in VS Code settings:

| Setting | Description |
|---|---|
| `auth0Domain` | Auth0 tenant domain. A value starting with `http` is used as-is, e.g. for a local mock server. |
| `auth0ClientId` | Auth0 application Client ID. |
| `auth0Audience` | Auth0 API identifier. Required to get a JWT access token. |
| `auth0Scope` | OAuth scopes. Include `offline_access` to get a refresh token. |
| `redirectUri` | OAuth `redirect_uri`. Must be an Allowed Callback URL in Auth0. |
| `apiBaseUrl` | CWS base URL. |

`definitionExtension.callbackPort` (default `42813`) is the port the loopback server listens on. Both environments share it.

## Authentication

The identity provider is [Auth0](https://auth0.com/). Sign-in uses the Authorization Code flow with PKCE:

1. The extension starts a loopback server on `127.0.0.1:<callbackPort>` and opens the Auth0 `/authorize` page in the browser.
2. Auth0 redirects to `redirectUri`, which is the admin app's `/extension/redirect` page. That page passes the `code` and `state` on to the loopback server.
3. The extension checks `state` and exchanges the code for tokens at `/oauth/token`.

Tokens are stored per environment, so you can be signed in to Stage and Production at the same time.
