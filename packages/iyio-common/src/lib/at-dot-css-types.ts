/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseLayoutProps } from "./base-layout";
import { ClassNameValue } from "./css";
import type { StyleSheetOrder } from "./css-order";
import { Trim, WhiteSpace } from "./typescript-util-types";



type DropEnd<S extends string>=string extends S?
    'Error':
    S extends `${infer Name}${'.'|'['|'>'|WhiteSpace}${infer _Rest}`?
        DropEnd<Trim<Name>>:
        S;

type FilterAt<S extends string>=string extends S?
    'Error':
    S extends `@.${infer Name}`?
        DropEnd<Trim<Name>>:
        never;

type SplitClasses<S extends string>=string extends S?
    'Error':
    S extends `${infer Name},${infer Rest}`?
        FilterAt<Trim<Name>>|SplitClasses<Trim<Rest>>:
        FilterAt<Trim<S>>;

type SplitDot<S extends string>=string extends S?
    'Error':
    S extends `${infer Start}.${infer End}`?
        Start|SplitDot<End>:
        S;

type GetValue<S extends string>=string extends S?
    'Error':
    S extends `${infer _Start}.${infer Classes}${','|'{'|WhiteSpace}${infer Rest}`?
        SplitDot<Classes>:
        '___AT_DOT_NOT_PROP___';

export type ParseAtDotCss<S extends string,Suffix extends string='@@'>=string extends S?
    'Error':
    S extends `${infer _Start}@.${infer ClassName}{${infer Rest}`?
        {
            [K in `${SplitClasses<`@.${Trim<ClassName>}`>}${Suffix}`]:GetValue<`${ClassName} `>;
        } & Exclude<ParseAtDotCss<Rest,`${Suffix}@`>,S>
    :
        {___AT_DOT_NOT_PROP___:true}
    ;

type SplitSection<S extends string>=string extends S?
    'Error':
    S extends `${infer Before}/*-${infer _Comment}-*/${infer After}`?
        Before|SplitSection<After>:
        S;

type SplitLargeSection<S extends string>=string extends S?
    'Error':
    S extends `${infer Before}/***-${infer _Comment}-***/${infer After}`?
        Before|SplitLargeSection<After>:
        S;


export type GetAtDotClassName<T>=
    ((selectors?:T|null,options?:{classNameValues?:ClassNameValue,baseLayout?:BaseLayoutProps})=>string);

type RemoveSuffix<S>=S extends string?S extends `${infer Name}@${infer _Rest}`?Name:S:never;

export interface AtDotStyleCtrl
{
    insertStyleSheet():void;
    removeStyleSheet():void;
    isStyleSheetInserted():boolean;
}

export type ParseAtDotStyle<
    S extends string,
    P=Omit<ParseAtDotCss<SplitSection<SplitLargeSection<
        `@.root{};${S}`
    >>>,'___AT_DOT_NOT_PROP___'>,
    M={
        readonly [K in keyof P as K extends string?RemoveSuffix<K>:never ]:
            GetAtDotClassName<{[CK in P[K] extends string?Exclude<P[K],'___AT_DOT_NOT_PROP___'>:never]?:any}>
    }
>=M & ({root:()=>string});

export interface AtDotStyle<S extends string>
{
    id?:string;
    namespace?:string;
    name:string;
    disableAutoInsert?:boolean;
    css:S;
    disableParsing?:boolean;
    order?:number|StyleSheetOrder;
    /**
     * If true and a namespace is included the root class name will also include the name without
     * the name space. For example a sheet with includeNameWithoutNameSpace set to true and a name
     * of Example and a namespace of meNamespace will have a class name of "Example meNamespace--Example" when
     * normally it would only have a class name of "meNamespace--Example"
     */
    includeNameWithoutNameSpace?:boolean;
}

export type AtDotStyleDefaults=Partial<Omit<AtDotStyle<string>,'css'>>;
