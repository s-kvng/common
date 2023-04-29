import { ZodError, ZodSchema } from "zod";
import { HttpMethod } from "./http-types";

export const RawFnFlag=Symbol('RawFnFlag');

export interface RawFnResult
{
    result:any;
    rawFlag:typeof RawFnFlag;
}

export type FnHandler=(eventSource:FnEvent,input:any)=>any|Promise<any>;

export interface FnBaseHandlerOptions
{
    logRequest?:boolean;
    returnsHttpResponse?:boolean;
    inputScheme?:ZodSchema;
    outputScheme?:ZodSchema;
}

export interface FnHandlerOptions extends FnBaseHandlerOptions
{
    evt:any;
    context:any;
    handler:FnHandler;
}

export interface FnEvent
{
    sourceEvent:any;
    context:any;
    path:string;
    method:HttpMethod;
    routePath:string;
    query:Record<string,string>;
    headers:Record<string,string>;
    claims:Record<string,any>;
    /**
     * Typically a user id
     */
    sub?:string;
}

export interface FnError
{
    ______FnError:true,
    errorCode:number;
    errorMessage:string;
    errorZod?:ZodError;
    errorMetadata?:any;
}

export const isFnError=(value:any):value is FnError=>{
    if(!value){
        return false;
    }
    return value['______FnError']===true;
}

export const createFnError=(code:number,message:string,zodError?:ZodError,metadata?:any):FnError=>{
    return {
        ______FnError:true,
        errorCode:code,
        errorMessage:message,
        errorZod:zodError,
        errorMetadata:metadata,
    }
}

export interface FnInvokeEvent<TInput=any>
{
    ______isFnInvokeEvent:true;
    input?:TInput;
    jwt?:string;
}

export const isFnInvokeEvent=(value:any):value is FnInvokeEvent=>{
    return value?.______isFnInvokeEvent===true;
}
