// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as path from "path";

import * as extension from "../extension";
import AzureMapEditor from './mapeditor';

export default class AzureMapManager implements vscode.WebviewPanelSerializer {
    public static readonly instance = new AzureMapManager();

    private readonly _previews: AzureMapEditor[] = [];
    private _activePreview: AzureMapEditor | undefined = undefined;
    private _context: vscode.ExtensionContext | undefined = undefined;

    public setContext(context: vscode.ExtensionContext)
    {
        this._context = context;
    }

    public refresh() {
        for (const preview of this._previews) {
            preview.refresh();
        }
    }

    public preview(
        resource: vscode.Uri
    ): void {
        if (AzureMapManager.handlesUri(resource)) {
            let preview = this.getExistingPreview(resource);
            if (preview) {
                preview.reveal();
            } else if (this._context) {
                preview = this.createNewPreview(this._context, resource);
            }

            if (preview)
            {
                preview.update(resource);
            }
        }
    }

    public get activePreviewResource() {
        return this._activePreview && this._activePreview.resource;
    }

    public async deserializeWebviewPanel(
        webview: vscode.WebviewPanel,
        state: any
    ): Promise<void> {
        if (state && this._context) {
            const preview = await AzureMapEditor.revive(
                webview,
                this._context,
                state);

            this.registerPreview(preview);
        }
    }

    private getExistingPreview(
        resource: vscode.Uri
    ): AzureMapEditor | undefined {
        return this._previews.find(preview =>
            preview.matchesResource(resource));
    }

    private createNewPreview(
        context: vscode.ExtensionContext,
        resource: vscode.Uri
    ): AzureMapEditor {
        const preview = AzureMapEditor.create(
            context,
            resource);

        this._activePreview = preview;
        return this.registerPreview(preview);
    }

    private registerPreview(
        preview: AzureMapEditor
    ): AzureMapEditor {
        this._previews.push(preview);

        preview.onDispose(() => {
            const existing = this._previews.indexOf(preview);
            if (existing === -1) {
                return;
            }

            this._previews.splice(existing, 1);
            if (this._activePreview === preview) {
                this._activePreview = undefined;
            }
        });
        
        preview.onDidChangeViewState(({ webviewPanel }) => {
            this._activePreview = webviewPanel.active ? preview : undefined;
        });

        return preview;
    }

    private static handlesUri(
        uri: vscode.Uri
    ) : boolean {
        return true;
    }
}
