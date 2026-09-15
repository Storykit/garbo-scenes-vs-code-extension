import * as vscode from 'vscode';
import type { CurrentUser } from '../api/types';

export async function writeUsernameFile(user: CurrentUser): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    return;
  }
  const username = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const fileUri = vscode.Uri.joinPath(root.uri, 'username.txt');
  await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(username));
}
