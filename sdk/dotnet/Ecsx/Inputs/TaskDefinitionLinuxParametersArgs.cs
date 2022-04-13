// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ecsx.Inputs
{

    public sealed class TaskDefinitionLinuxParametersArgs : Pulumi.ResourceArgs
    {
        [Input("capabilities")]
        public Input<Inputs.TaskDefinitionKernelCapabilitiesArgs>? Capabilities { get; set; }

        [Input("devices")]
        private InputList<Inputs.TaskDefinitionDeviceArgs>? _devices;
        public InputList<Inputs.TaskDefinitionDeviceArgs> Devices
        {
            get => _devices ?? (_devices = new InputList<Inputs.TaskDefinitionDeviceArgs>());
            set => _devices = value;
        }

        [Input("initProcessEnabled")]
        public Input<bool>? InitProcessEnabled { get; set; }

        [Input("maxSwap")]
        public Input<int>? MaxSwap { get; set; }

        [Input("sharedMemorySize")]
        public Input<int>? SharedMemorySize { get; set; }

        [Input("swappiness")]
        public Input<int>? Swappiness { get; set; }

        [Input("tmpfs")]
        private InputList<Inputs.TaskDefinitionTmpfsArgs>? _tmpfs;
        public InputList<Inputs.TaskDefinitionTmpfsArgs> Tmpfs
        {
            get => _tmpfs ?? (_tmpfs = new InputList<Inputs.TaskDefinitionTmpfsArgs>());
            set => _tmpfs = value;
        }

        public TaskDefinitionLinuxParametersArgs()
        {
        }
    }
}
