import * as vscode from 'vscode';
import { getNonce } from './get-nonce';

export interface LibState {
  filesWatcherExclude: string;
  filesExclude: string;
  gitExclude: string;
  exclude: boolean;
}

export class ExcludeView implements vscode.WebviewViewProvider {

  public static readonly viewType = 'ng-workspace-project-excluder.excludeView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'buildState': {
          this.buildState();
          break;
        }
        case 'saveState': {
          this.saveState(JSON.parse(data.value));
          break;
        }
        case 'reloadWindow': {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
          break;
        }
      }
    });
  }

  public async buildState(): Promise<void> {
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceUri) {
      return;
    }

    const projectsUri = vscode.Uri.joinPath(workspaceUri, 'projects');

    try {
      await vscode.workspace.fs.stat(projectsUri);
    } catch {
      this._view?.webview.postMessage({ type: 'state', value: {} });
      return;
    }

    const projectsDirContent = await vscode.workspace.fs.readDirectory(projectsUri);
    const libNames = projectsDirContent.filter(x => x[1] === vscode.FileType.Directory).map(x => x[0]);

    const conf = vscode.workspace.getConfiguration(''); //gets a merged view of global and workspace settings
    const filesExcludeConf: { [key: string]: any } = conf.get('files.exclude') || {};

    const state: { [key: string]: LibState } = {};
    for (let name of libNames) {
      const filesExclude = `projects/${name}`
      state[name] = {
        filesExclude,
        gitExclude: `./projects/${name}`,
        filesWatcherExclude: `**/projects/${name}/**`,
        exclude: !!filesExcludeConf[filesExclude]
      };
    }
    this._view?.webview.postMessage({ type: 'state', value: state });
  }

  public saveState(state: { [key: string]: LibState } = {}): void {
    if (Object.keys(state).length === 0) {
      return;
    }

    const conf = vscode.workspace.getConfiguration('');
    const filesExcludeConf: { [key: string]: any } = conf.get('files.exclude', {});
    const filesWatcherExcludeConf: { [key: string]: any } = conf.get('files.watcherExclude', {});
    const gitExcludeConf: string[] = conf.get('git.ignoredRepositories', []);

    let filesExcludeUpdate = { ...filesExcludeConf };
    let filesWatcherExcludeUpdate = { ...filesWatcherExcludeConf };
    let gitExcludeUpdate = [ ...gitExcludeConf ];

    for (let [, libState] of Object.entries(state)) {
      filesExcludeUpdate[libState.filesExclude] = libState.exclude;
      filesWatcherExcludeUpdate[libState.filesWatcherExclude] = libState.exclude;
      if (libState.exclude) {
        if (!gitExcludeUpdate.includes(libState.gitExclude)) {
          gitExcludeUpdate.push(libState.gitExclude);
        }
      } else {
        gitExcludeUpdate = gitExcludeUpdate.filter(x => x !== libState.gitExclude);
      }
    }

    conf.update('files.exclude', filesExcludeUpdate, vscode.ConfigurationTarget.Workspace);
    conf.update('files.watcherExclude', filesWatcherExcludeUpdate, vscode.ConfigurationTarget.Workspace);
    conf.update('git.ignoredRepositories', gitExcludeUpdate, vscode.ConfigurationTarget.Workspace);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'vscode-codicons', 'dist', 'codicon.css'));
    const codiconsFontUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'vscode-codicons', 'dist', 'codicon.ttf'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${codiconsFontUri}; style-src ${webview.cspSource} ${codiconsUri}; script-src 'nonce-${nonce}';">
        <link href="${codiconsUri}" rel="stylesheet" />

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title></title>
			</head>
			<body>
        <div class="header">
          Exclude projects
        </div>
        <div class="libs-container">No projects found</div>

        <div class="select-buttons">
          <button class="select-all-button">Select all</button>
          <button class="unselect-all-button">Unselect all</button>
        </div>
				<button class="refresh-button">Refresh project list</button>

        A <span class="reload-button">window reload</span> is recommend after a change.

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
