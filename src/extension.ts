import * as vscode from 'vscode';
import { ExcludeView } from './exclude-view';

export function activate(context: vscode.ExtensionContext) {

  const excludeViewProvider = new ExcludeView(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ExcludeView.viewType, excludeViewProvider)
  );
}
