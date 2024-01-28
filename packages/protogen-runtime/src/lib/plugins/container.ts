import { joinPaths, safeParseNumberOrUndefined } from "@iyio/common";
import { ProtoPipelineConfigurablePlugin, protoAddContextParam, protoChildrenToStringRecordOrUndefined, protoGetParamName } from "@iyio/protogen";
import { z } from "zod";
import { ContainerInfoTemplate, containerCdkTemplate } from "./containerCdkTemplate";

const supportedTypes=['container'];

const ContainerPluginConfig=z.object(
{
    /**
     * @default "Containers"
     */
    containerCdkConstructClassName:z.string().optional(),

    /**
     * If defined a CDK construct file will be generated that can be used to deploy the user pool
     */
    containerCdkConstructFile:z.string().optional(),
})

export const containerPlugin:ProtoPipelineConfigurablePlugin<typeof ContainerPluginConfig>=
{
    configScheme:ContainerPluginConfig,
    generate:async ({
        outputs,
        log,
        nodes,
        libStyle,
        paramMap,
        paramPackage,
        importMap
    },{
        containerCdkConstructClassName='Containers',
        containerCdkConstructFile=libStyle==='nx'?`packages/cdk/src/${containerCdkConstructClassName}.ts`:undefined,
    })=>{

        const supported=nodes.filter(n=>supportedTypes.some(t=>n.types.some(nt=>nt.type===t)));

        log(`${supported.length} supported node(s)`);
        if(!supported.length){
            return;
        }

        for(const node of supported){
            protoAddContextParam(node.name+'TaskArn',paramPackage,paramMap,importMap);
            protoAddContextParam(node.name+'ServiceArn',paramPackage,paramMap,importMap);
        }

        if(containerCdkConstructFile){
            outputs.push({
                path:containerCdkConstructFile,
                content:containerCdkTemplate(containerCdkConstructClassName,supported.map<ContainerInfoTemplate>(q=>{
                    const c=q.children??{};
                    const pkg=c['package']?.value;
                    const path=c['path']?.value??joinPaths('../../packages',pkg??q.name);
                    const info:ContainerInfoTemplate={
                        grantAccess:true,
                        name:q.name,
                        path,
                        serviceArnParam:protoGetParamName(q.name+'ServiceArn'),
                        taskArnParam:protoGetParamName(q.name+'TaskArn'),
                        vCpuCount:safeParseNumberOrUndefined(c['vCpuCount']?.value),
                        memoryMb:safeParseNumberOrUndefined(c['memoryMb']?.value),
                        cpuArchitecture:c['cpuArchitecture']?.value as any,
                        env:protoChildrenToStringRecordOrUndefined(c['env']?.children),
                        port:safeParseNumberOrUndefined(c['port']?.value),
                        enableExecuteCommand:c['enableExecuteCommand']?true:undefined,
                        healthCheckPath:c['healthCheckPath']?.value,
                        healthCheckCmd:c['healthCheckCmd']?.value,
                        healthCheckIntervalSeconds:safeParseNumberOrUndefined(c['healthCheckIntervalSeconds']?.value),
                        healthCheckRetries:safeParseNumberOrUndefined(c['healthCheckRetries']?.value),
                        healthCheckTimeoutSeconds:safeParseNumberOrUndefined(c['healthCheckTimeoutSeconds']?.value),
                        healthCheckStartSeconds:safeParseNumberOrUndefined(c['healthCheckStartSeconds']?.value),
                        enableScaling:c['enableScaling']?true:undefined,
                        minInstanceCount:safeParseNumberOrUndefined(c['minInstanceCount']?.value),
                        maxInstanceCount:safeParseNumberOrUndefined(c['maxInstanceCount']?.value),
                        targetCpuUsage:safeParseNumberOrUndefined(c['targetCpuUsage']?.value),
                        scaleUpSeconds:safeParseNumberOrUndefined(c['scaleUpSeconds']?.value),
                        scaleDownSeconds:safeParseNumberOrUndefined(c['scaleDownSeconds']?.value),
                    }
                    return info;
                }),importMap)
            })
        }
    }
}
