// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as path from 'path';
import { Disposable, window } from 'vscode';
import { FileHandle, open } from 'fs/promises';

export default class AzureMapEditor 
{
    private _resource: vscode.Uri;
    private _processing: boolean;
    private  _context: vscode.ExtensionContext;
    private _disposable: Disposable;
    _webview: vscode.WebviewPanel;

    public get state() {
        return {
            resource: this.resource.toString()
        };
    }

    public static create(
        context: vscode.ExtensionContext,
        resource: vscode.Uri
        ) : AzureMapEditor
    {
        // Create and show a new webview
        var editor = vscode.window.createWebviewPanel(
            'mapeditor', // Identifies the type of the webview. Used internally
            'Azure Map Editor', // Title of the panel displayed to the user
            vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        return new AzureMapEditor(editor, context, resource);
    } 

    private constructor(
        webview: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        resource: vscode.Uri
    )
    {
        this._webview = webview;
        this._context = context;
        this._resource = resource;
        this._processing = false;

        let subscriptions: Disposable[] = [];

        const templateFilename = this._context.asAbsolutePath("templates/mapeditor.html");
        vscode.workspace.openTextDocument(templateFilename).then(doc => {
            var previewText = doc.getText();
            this._webview.webview.html = previewText;

            const config = vscode.workspace.getConfiguration("vscode-ros-azure");
            let mapsKey = config.get("mapskey", "");
            let mapsClientId = config.get("mapsclientid", "");
    
            this._webview.webview.postMessage(
                { 
                    command: 'setmapskey', 
                    mapsKey: mapsKey,
                    clientId: mapsClientId
                });

            setTimeout(() => this.refresh(), 1000); 
        });

        // Handle messages from the webview
        this._webview.webview.onDidReceiveMessage(
            async message => {
            switch (message.command) {
                case 'alert':
                vscode.window.showErrorMessage(message.text);
                return;

                case 'points':
                    //points[0].geometry.coordinates[0] lattitude
                    // points[0].geometry.coordinates[1] longitude
                    // points[0].properties.elevation: height in meters
                    let csv = path.join(path.dirname(resource.path), "file.csv");
                    let csvHandle : FileHandle;
                    try {
                        csvHandle = await open(csv, 'w+');
                        csvHandle.appendFile('Longitude,Latitude,Elevation\r\n');
                      message.points.forEach(function(c : any) {
                        csvHandle.appendFile(
                            c.geometry.coordinates[0] + ',' +
                            c.geometry.coordinates[1] + ',' +
                            c.properties.elevation + '\r\n'
                            );
                        });

                    } finally {
                      //await filehandle?.close();
                    }

                    let vrt = path.join(path.dirname(resource.path), "file.vrt");
                    let vrtHandle : FileHandle;
                    try {
                        vrtHandle = await open(vrt, 'w');
                        vrtHandle.appendFile(`
<OGRVRTDataSource> 
    <OGRVRTLayer name="file"> 
        <SrcDataSource relativeToVRT="1">file.csv</SrcDataSource>
        <LayerSRS>WGS84</LayerSRS> 
        <GeometryType>wkbPoint</GeometryType> 
        <GeometryField encoding="PointFromColumns" x="Longitude" y="Latitude" z="Elevation"/> 
    </OGRVRTLayer> 
</OGRVRTDataSource>`);

                    } finally {
//                      await filehandle?.close();
                    }

                    return;
            }
            },
            undefined,
            context.subscriptions
        );

        this._webview.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                setTimeout(() => this.refresh(), 1000);
            }
            this._onDidChangeViewStateEmitter.fire(e);
        }, this, subscriptions);


        vscode.workspace.onDidSaveTextDocument(event => {

            if (event && this.isPreviewOf(event.uri)) {
                this.refresh();
            }
        }, this, subscriptions);

        this._webview.onDidDispose(() => {
            this.dispose();
        }, null, subscriptions);        

        this._disposable = Disposable.from(...subscriptions);
    }

    public get resource(): vscode.Uri {
        return this._resource;
    }

    public async refresh() {
        if (this._processing === false) {
            this.loadResource();
        }
    }

    private async loadResource() {
        this._processing = true;

        this._processing = false;
    }

    public static async revive(
        webview: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        state: any,
    ): Promise<AzureMapEditor> {
        const resource = vscode.Uri.parse(state.previewFile);

        const preview = new AzureMapEditor(
            webview,
            context,
            resource);

        return preview;
    }    

    public matchesResource(
        otherResource: vscode.Uri
    ): boolean {
        return this.isPreviewOf(otherResource);
    }

    public reveal() {
        this._webview.reveal(vscode.ViewColumn.Two);
    }    

    private isPreviewOf(resource: vscode.Uri): boolean {
        return this._resource.fsPath === resource.fsPath;
    }

    private readonly _onDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDispose = this._onDisposeEmitter.event;    
    
    private readonly _onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
    public readonly onDidChangeViewState = this._onDidChangeViewStateEmitter.event;

    public update(resource: vscode.Uri) {
        const editor = vscode.window.activeTextEditor;

        // If we have changed resources, cancel any pending updates
        const isResourceChange = resource.fsPath !== this._resource.fsPath;
        this._resource = resource;
        // Schedule update if none is pending
        this.refresh();
    }
    
    public dispose() {
        this._disposable.dispose();
        this._onDisposeEmitter.fire();
        this._onDisposeEmitter.dispose();

        this._onDidChangeViewStateEmitter.dispose();
        this._webview.dispose();    
    }
}
