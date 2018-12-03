# Design principles for aws-infra components.

When designin an aws-infra component, we want to produce code that supports the following principles.

1. Components should not feel like large deviations from the core aws resources they wrap.  They should 
feel like light and natural extensions and aggregations of existing resources and concepts. For example,
an awsinfr.ecs.Cluster is an easier to use extension of an aws.ecs.Cluster.  An awsinfra.ecs.Service is
a more convenient aws.ecs.Service.

2. Components should use the same module names, and similar class names to the raw aws resources they are
wrapping to help provide familiarity and to clearly indicate what part of aws they are providing convenience
over.

3. As much as possible, component resources should accept a highly overlapping set of options to the resource
they wrap. For example, an awsinfra.ecs.TaskDefinition should accept very similar arguments as an aws.ecs.TaskDefinition.
Exceptions:
   * A component can hide options that they will be entirely responsible for.  For example, an 
     awsinfra.ecs.FargateTaskDefinition will supply suitable 'Fargate' arguments for many TaskDefinition 
     arguments, alleviating the burder on the user to pass those values in.
   * A component should make required parameters optional, if they can provide reasonable defaults.  For 
     example, a FargateTaskDefinition can provide suitable minimal values for `cpu` and `memory` allowing 
     the user to not have to provide them if the defaults are acceptable.
   * A component can add properties.
   
4. Components will generally be a collection of sensibly bound-together resources.  For example, an 
   awsinfra.ecs.Cluster helps simplify creating an aws Cluster by also automatically provisioning 
   SecurityGroups for the user that can allow ingress/egress from the Cluster.  When components 
   automatically create resources on behalf of the user they should also:
    * Allow the user to pass in values for those resources explicitly.
    * Provide access to the defaults for those child resources through statics on the type. For example
      awsinfra.ecs.Cluster exposes defaultSecurityGroupIngress and defaultSecurityGroupEgress.  This
      allows clients to use portions of the defaults without having to manually copy everything themselves
    * Provide a helper static to create the resources with optional values for anything that can be 
      defaulted in.  This allows users to slightly override some part of a defualt value, while not
      having to replicate all the creation code.  For example awsinfra.ecs.TaskDefinition exposes 
      `createTaskRole` and `createExecutionRole` to allow users to use the same logic, while passing
      in different data.
    * The above three items effectively serve to give the user full control over the child resources, 
      while also being able to leverage both the default data and the default logic of our components.
      Without the latter two items, users who wanted to tweak something small would have to replicate
      a both. 
      
     
