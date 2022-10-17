// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as child_process from "child_process";
import * as vscode from "vscode";

import * as extension from "../extension";


//gdal_grid -a invdist:power=2.0:smoothing=1.0 -of GTiff -l dem file.vrt file.dem

export function hasGdal(): Promise<any> 
{
    
}



export function gdal(filename: string): Promise<any> {
    return new Promise((resolve, reject) => {
        let processOptions = {
            windowsHide: false,
        };

        let xacroCommand: string;
        if (process.platform === "win32") {
            xacroCommand = `cmd /c "xacro "${filename}""`;
        } else {
            xacroCommand = `bash -c "xacro '${filename}' && env"`;
        }

        child_process.exec(xacroCommand, processOptions, (error, stdout, _stderr) => {
            if (!error) {
                resolve(stdout);
            } else {
                reject(error);
            }
        });
    });
}
