// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ecr.Inputs
{

    /// <summary>
    /// Simplified lifecycle policy model consisting of one or more rules that determine which images in a repository should be expired. See https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html for more details.
    /// </summary>
    public sealed class LifecyclePolicyArgs : Pulumi.ResourceArgs
    {
        [Input("rules")]
        private InputList<Inputs.LifecyclePolicyRuleArgs>? _rules;

        /// <summary>
        /// Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.
        /// </summary>
        public InputList<Inputs.LifecyclePolicyRuleArgs> Rules
        {
            get => _rules ?? (_rules = new InputList<Inputs.LifecyclePolicyRuleArgs>());
            set => _rules = value;
        }

        /// <summary>
        /// Skips creation of the policy if set to `true`.
        /// </summary>
        [Input("skip")]
        public bool? Skip { get; set; }

        public LifecyclePolicyArgs()
        {
        }
    }
}
