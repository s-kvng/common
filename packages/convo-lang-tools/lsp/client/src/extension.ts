/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { Lock, delayAsync } from '@iyio/common';
import { parseConvoCode } from '@iyio/convo-lang';
import { ConvoLangCli } from '@iyio/convo-lang-cli';
import * as path from 'path';
import { ExtensionContext, ProgressLocation, Range, commands, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client:LanguageClient;

const example=/*convo*/`
# Builds a vehicle for the user
> buildVehicle(

    # A short description of the vehicle
    description:string;

    # The color of the vehicle
    color?:string

    # The type of the vehicle
    type:enum('car' 'truck' 'van' 'boat')

    # The top speed of the vehicle in miles per hour
    topSpeed:number

    # The max payload capcapty the vehicle can cary in pounds
    payloadCapacity?:number;
) -> (

    return({
        isTruck:eq(type,'truck')
        isFast:gte(topSpeed,150)
    })
)

> system
You are funny mechanical engineer helping a customer build a vehicle. Use the buildVehicle function
to build vehicles.

> user
I need a car that can do the quarter mile in 7 seconds or less

> user
Use the buildVehicle function to build my vehicle

`

export function activate(context:ExtensionContext){

    registerCommands(context);
    startLsp(context);
}

export function deactivate():Thenable<void>|undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

const startLsp=(context:ExtensionContext)=>{

	const serverModule=context.asAbsolutePath(
		path.join('lsp','server','out','server.js')
	);

	const serverOptions:ServerOptions={
		run:{module:serverModule,transport:TransportKind.ipc},
		debug:{
			module:serverModule,
			transport:TransportKind.ipc,
		}
	};

	const clientOptions:LanguageClientOptions={
		documentSelector:[{scheme:'file',language:'source.convo'}],
	};

	client=new LanguageClient(
		'convoLanguageServer',
		'Convo Language Server',
		serverOptions,
		clientOptions
	);

	client.start();

}

const registerCommands=(context:ExtensionContext)=>{

    context.subscriptions.push(commands.registerCommand('convo.parse', async () => {
        const document=window.activeTextEditor?.document;
        if(!document){
            return;
        }

        let src:string|undefined=undefined;

        if(document.languageId==='source.convo'){
            src=document?.getText();
        }else{
            const selection=window.activeTextEditor?.selection
            if(selection){
                src=document.getText(new Range(selection.start,selection.end));
            }
        }

        if(!src){
            return;
        }

        const r=parseConvoCode(src);

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(r.result??r,null,4)
        })

        await window.showTextDocument(doc);


    }));

    context.subscriptions.push(commands.registerCommand('convo.complete', async () => {

        const document=window.activeTextEditor?.document;

        if(document?.languageId!=='source.convo'){

            let createdNew=false;

            const selection=window.activeTextEditor?.selection
            if(document && selection){
                const text=document.getText(new Range(selection.start,selection.end));
                if(text){
                    const doc=await workspace.openTextDocument({language:'source.convo',content:text})
                    await window.showTextDocument(doc);
                    createdNew=true;
                }
            }

            if(!createdNew){

                const option=await window.showWarningMessage(
                    'Conversation completion requires a .convo file', 'Complete example', 'Create empty', 'Dismiss'
                );

                if(option==='Create empty'){
                    const doc=await workspace.openTextDocument({language:'source.convo',content:'> system\nsystem prompt here\n\n> user\nprompt here\n'})
                    await window.showTextDocument(doc);
                    return;
                }else if(option==='Complete example'){
                    const doc=await workspace.openTextDocument({language:'source.convo',content:example})
                    await window.showTextDocument(doc);
                }else{
                    return;
                }
            }

        }

        await window.withProgress({
            location: ProgressLocation.Notification,
            title: "Completing conversation",
            cancellable: true
        }, async (progress, token) => {

            const document=window.activeTextEditor?.document;
            if(!document){
                return;
            }

            const src=document?.getText();
            if(!src){
                return;
            }
            progress.report({ message:document.uri.path });

            let done=false;

            try{
                const lock=new Lock(1);

                const startLength=src.length;

                const setCodeAsync=async (code:string,isFinal:boolean,append:boolean)=>{
                    const release=await lock.waitAsync();
                    try{
                        if(done && !isFinal){
                            return;
                        }
                        const editor=await window.showTextDocument(document);

                        await editor.edit(builder=>{
                            if(done && !isFinal){
                                return;
                            }
                            const all=append?
                                new Range(document.positionAt(startLength),document.positionAt(document.getText().length)):
                                new Range(document.positionAt(0),document.positionAt(document.getText().length));
                            builder.replace(all,code);
                        })
                    }finally{
                        release();
                    }
                }


                (async ()=>{
                    let i=0;
                    while(!done){
                        await setCodeAsync(`\n\n// completing.${'.'.repeat(i%4)}\n`,false,true);
                        i++;
                        if(done){
                            break;
                        }
                        await delayAsync(1000);
                    }
                })()

                const cli=new ConvoLangCli({inline:src,bufferOutput:true});

                await cli.executeAsync();
                done=true;

                if(token.isCancellationRequested){
                    return;
                }
                await setCodeAsync(cli.buffer.join(''),true,false);
            }finally{
                done=true;
            }


        });

    }));
}
