# Definition Extension

The Definition Extension is a VS Code extension for the slide definitions in [garbo-scenes](https://github.com/Storykit/garbo-scenes). It gets the definitions from CWS and writes them as JSON files into the scene directories. It uses Auth0 to sign in to Storykit.

## Local development

### Set up the project

Run `npm install`.

### Run the extension

1. Open this project in VS Code.
2. Push `F5` (**Run Extension**). VS Code compiles the extension and opens an Extension Development Host window.
3. In the Extension Development Host window, open the garbo-scenes repository.

> **Note:** The extension uses only the first workspace folder.

To rebuild the extension when you change the code:

1. Run `npm run watch`.
2. In the Extension Development Host window, run the command `Developer: Reload Window`.

### Build the extension

- To bundle the extension, run `npm run compile`. This command uses esbuild and writes `dist/extension.js`.
- esbuild does not do a type check. To do a type check, run `npm run typecheck` (`tsc --noEmit`).
- To make a `.vsix` package, run `npm run package`. Before you do this, install [vsce](https://github.com/microsoft/vscode-vsce) (`npm i -g @vscode/vsce`).

> **Note:** The default build task (`F5`) and `npm run package` do the type check and the bundle.

### Lint the code

- To find lint errors, run `npm run lint`.
- To repair the errors that ESLint can repair automatically, run `npm run lint:fix`.

### Format the code

- To examine the format of the files, run `npm run format`.
- To change the files to the correct format, run `npm run format:fix`.


## Use the extension

The extension adds the **Definition Extension** view to the activity bar.

1. Select **Stage** or **Production**.
2. Sign in.
3. Select the operation that you want to do.

| Operation | Input | Output |
|---|---|---|
| Export definition | The definition in CWS | `dataSchema.json`, `uiSchema.json` |
| Export variables | The definition in CWS | `definition_values.json` |
| Generate data | The local `dataSchema.json` | `data.json` |

Each operation uses one scene directory. The name of a scene directory is the same as the name of a definition type in CWS.

- To select a directory, write its name in the **Definition type name** field.
- If the field is empty, the extension uses the directory of the file that is open in the editor.

You can use these options:

- **All top-level directories**: The extension does the operation on all scene directories. It does not use hidden directories, `node_modules`, `00_TEMPLATE`, `01_LOCAL_BACKGROUND`, `background` and `shared_modules`. If the operation fails in one directory, the extension continues in the other directories.
- **Only write if empty**: The extension does not change files that have content. To overwrite these files, clear this option.

The extension writes JSON with an indent of 4 spaces and no newline at the end of the file. Approximately 90% of the JSON files in garbo-scenes use this format.

To see the request and response logs, run the command **Definition Extension: Show Request Logs**.

## Architecture

### Code structure

- **src**: The source code of the extension. The top level contains the entry point and the modules that the other directories use (environments and logging).
  - **auth**: Auth0 sign-in, token refresh and token storage.
  - **api**: Communication with CWS.
  - **operations**: The operations that the buttons in the view start. These operations do not use the UI.
  - **workspace**: Read and write operations on the files and directories in the workspace.
  - **webview**: The sidebar view and the messages that it sends and receives.
- **media**
  - **webview**: The HTML, CSS and JS files for the view. There is one folder for each state (`loginForm`, `signedIn`).

## Environment configuration

Each environment has its own settings in `definitionExtension.stage.*` and `definitionExtension.production.*`. The default values are in `contributes.configuration` in `package.json`. You can change these values in the VS Code settings.

| Setting | Description |
|---|---|
| `auth0Domain` | The domain of the Auth0 tenant. If the value starts with `http`, the extension uses the value as it is. Use this for a local mock server. |
| `auth0ClientId` | The Client ID of the Auth0 application. |
| `auth0Audience` | The identifier of the Auth0 API. This value is necessary to receive a JWT access token. |
| `auth0Scope` | The OAuth scopes. To receive a refresh token, include `offline_access`. |
| `redirectUri` | The OAuth `redirect_uri`. This value must be an Allowed Callback URL in Auth0. |
| `apiBaseUrl` | The base URL of CWS. |

`definitionExtension.callbackPort` is the port of the loopback server. The default value is `42813`. The two environments use the same port.

> **Note:** If a necessary setting is empty, the sign-in stops and the extension shows an error.

## Authentication

The identity provider is [Auth0](https://auth0.com/). The sign-in uses the Authorization Code flow with PKCE:

1. The extension starts a loopback server on `127.0.0.1:<callbackPort>`. Then it opens the Auth0 `/authorize` page in the browser.
2. Auth0 sends the browser to `redirectUri`. This is the `/extension/redirect` page of the admin app. This page sends the `code` and the `state` to the loopback server.
3. The extension makes sure that the `state` is correct. Then it sends the code to `/oauth/token` and receives the tokens.

If the loopback server does not receive the code in 120 seconds, the sign-in stops. If you start a new sign-in, the extension stops the previous sign-in.

The extension keeps the tokens for each environment separately. Thus, you can be signed in to Stage and Production at the same time.
