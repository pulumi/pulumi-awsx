// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ecs.Inputs
{

    public sealed class TaskDefinitionHostEntryArgs : global::Pulumi.ResourceArgs
    {
        [Input("hostname")]
        public Input<string>? Hostname { get; set; }

        [Input("ipAddress")]
        public Input<string>? IpAddress { get; set; }

        public TaskDefinitionHostEntryArgs()
        {
        }
        public static new TaskDefinitionHostEntryArgs Empty => new TaskDefinitionHostEntryArgs();
    }
}
