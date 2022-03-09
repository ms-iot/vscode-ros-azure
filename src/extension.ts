// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import AzureMapsManager from "./azuremaps/mapManager";
import { AzureAccountExtensionApi, AzureSession } from './azure-account.api';

export enum Commands {
    editAzureMap = "vscode-ros-azure.editAzureMap",
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ros-azure" is now active!');

	AzureMapsManager.instance.setContext(context);

	let disposable = vscode.commands.registerCommand(Commands.editAzureMap, async () => {
		const azureAccount = vscode.extensions.getExtension<AzureAccountExtensionApi>('ms-vscode.azure-account')!.exports;

        if (!(await azureAccount.waitForLogin())) 
		{
            return vscode.commands.executeCommand('azure-account.askForLogin');
        }

		if (vscode.window.activeTextEditor)
		{
			AzureMapsManager.instance.preview(vscode.window.activeTextEditor.document.uri);
		}
		else
		{
			await vscode.window.setStatusBarMessage("Please select a file in the ROS package you'd like to update");
		}
	});

	vscode.window.registerWebviewPanelSerializer('AzureMapsEditor', AzureMapsManager.instance);

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
