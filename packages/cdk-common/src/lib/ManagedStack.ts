import { awsRegionParam } from '@iyio/aws';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { AccessManager } from "./AccessManager";
import { BridgeEvent } from './BridgeEvent';
import { ManagedProps } from './ManagedProps';
import { ParamOutput } from "./ParamOutput";
import { setDefaultVpc } from './cdk-lib';
import { ApiRouteTarget, IApiRouter, IEventTarget, IHasUserPool, NamedBucket, NamedFn, NamedQueue, SiteContentSource } from './cdk-types';
import { setDefaultClusterProps } from './cluster-lib';

export interface ManagedStackProps extends cdk.StackProps
{
    defaultVpc?:ec2.IVpc;
    disableFargateAutoScaling?:boolean;
    dedicatedVpc?:boolean;
}

export class ManagedStack extends cdk.Stack
{

    protected readonly params=new ParamOutput();

    protected readonly accessManager:AccessManager;

    protected readonly siteContentSources:SiteContentSource[]=[];

    protected readonly fns:NamedFn[]=[];

    protected readonly buckets:NamedBucket[]=[];

    protected readonly queues:NamedQueue[]=[];

    protected readonly events:BridgeEvent[]=[];

    protected readonly eventTargets:IEventTarget[]=[];

    protected readonly apiRouters:IApiRouter[]=[];

    protected readonly apiRouteTargets:ApiRouteTarget[]=[];

    protected readonly userPools:IHasUserPool[]=[];

    protected readonly beforeOutputs:((managed:ManagedProps)=>void)[]=[];

    public readonly managed:ManagedProps;

    public constructor(scope:Construct, id:string, {
        defaultVpc,
        disableFargateAutoScaling,
        dedicatedVpc,
        ...props
    }:ManagedStackProps={}){
        super(scope,id,props);

        if(defaultVpc){
            setDefaultVpc(defaultVpc);
        }else if(dedicatedVpc){
            setDefaultVpc(new ec2.Vpc(this,'DefaultVpc',{}))
        }

        setDefaultClusterProps({
            scope:this,
            name:'Cluster',
            fargateAutoScaling:!disableFargateAutoScaling,
        })

        this.accessManager=new AccessManager(this.account,this.region);

        this.params.setParam(awsRegionParam,this.region);

        this.managed={
            params:this.params,
            accessManager:this.accessManager,
            siteContentSources:this.siteContentSources,
            fns:this.fns,
            buckets:this.buckets,
            queues:this.queues,
            events:this.events,
            eventTargets:this.eventTargets,
            apiRouters:this.apiRouters,
            apiRouteTargets:this.apiRouteTargets,
            userPools:this.userPools,
            beforeOutputs:this.beforeOutputs,
        };
    }

    protected generateOutputs()
    {
        // events
        for(const e of this.events){
            for(const t of this.eventTargets){
                if(t.managedName===e.eventName){
                    e.addTarget(t);
                }
            }
        }

        // api routing
        for(const router of this.apiRouters){
            router.addMatchingTargets(this.apiRouteTargets);
        }

        for(const b of this.beforeOutputs){
            b(this.managed);
        }
        this.params.generateOutputs(this);
    }
}
