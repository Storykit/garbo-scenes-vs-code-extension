import * as path from 'node:path';
import * as vscode from 'vscode';
import { getWorkspaceRoot } from './workspaceRoot';

/**
 * Returns the name of the directory directly under the workspace root that
 * contains the currently active file, or undefined if there is no active
 * editor, the active file sits at the root itself, or it lies outside the root.
 */
export function inferNameFromActiveFile(): string | undefined {
  const root = getWorkspaceRoot();
  const fileUri = vscode.window.activeTextEditor?.document.uri;
  if (fileUri?.scheme !== root.scheme || fileUri.authority !== root.authority) {
    return undefined;
  }
  const relative = path.posix.relative(root.path, fileUri.path);
  if (relative === '..' || relative.startsWith('../')) {
    return undefined;
  }
  const [firstSegment, ...rest] = relative.split('/');
  return rest.length > 0 ? firstSegment : undefined;
}
