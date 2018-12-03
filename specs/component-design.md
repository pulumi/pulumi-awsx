# Design principles for aws-infra components.

When designin an aws-infra component, we want to produce code that supports the following principles.

1. Components should not feel like large deviations from the core aws resources they wrap.  They should 
feel like light and natural extensions and aggregations of existing resources and concepts. For example,
an `awsinfr.ecs.Cluster` is an easier to use extension of an `aws.ecs.Cluster`.  An `awsinfra.ecs.Service`
is a more convenient `aws.ecs.Service`.

1. Components should use the same module names, and similar class names to the raw aws resources they are
wrapping to help provide familiarity and to clearly indicate what part of aws they are providing convenience
over.

1. As much as possible, component resources should accept a highly overlapping set of options to the resource
they wrap. For example, an `awsinfra.ecs.TaskDefinition` should accept very similar arguments as an `aws.ecs.TaskDefinition`.
Exceptions:
   * A component can hide options that they will be entirely responsible for.  For example, an 
     `awsinfra.ecs.FargateTaskDefinition` will supply suitable `Fargate` arguments for many 
     `TaskDefinition` arguments, alleviating the burder on the user to pass those values in.
   * A component should make required parameters optional, if they can provide reasonable defaults.  
     For example, a `FargateTaskDefinition` can provide suitable minimal values for `cpu` and `memory` 
     allowing the user to not have to provide them if the defaults are acceptable.
   * A component can add properties.
   
1. Components will generally be a collection of sensibly bound-together resources.  For example, an 
   `awsinfra.ecs.Cluster` helps simplify creating an `aws.ecsCluster` by also automatically provisioning 
   `SecurityGroup`s for the user that can allow `ingress/egress` from the `Cluster`.  When components 
   automatically create resources on behalf of the user they should also:
    * Expose those resources on the component so that they are avialable to the client.
    * Allow the user to pass in values for those resources explicitly.
    * Provide access to the defaults for those child resources through statics on the type. For example
      `awsinfra.ecs.Cluster` exposes `defaultSecurityGroupIngress` and d`efaultSecurityGroupEgress`. This
      allows clients to use portions of the defaults without having to manually copy everything themselves
    * Provide a helper static to create the resources with optional values for anything that can be 
      defaulted in.  This allows users to slightly override some part of a defualt value, while not
      having to replicate all the creation code.  For example awsinfra.ecs.TaskDefinition exposes 
      `createTaskRole` and `createExecutionRole` to allow users to use the same logic, while passing
      in different data.
    * The above three items effectively serve to give the user full control over the creation of child 
      resources, while also being able to leverage both the default data and the default logic of our 
      components. Without the latter two items, users who wanted to tweak something small would have to 
      replicate both. 
      
1. When sensible, allow components to expose 'deployment-time' instance methods that help create other 
   components.  This should generally only be provided when:
   * There is a intuitive link between the two resources and how they relate to each other.  i.e. 
     `TaskDefinition`s and `Service`s.  
   * Providing the instance method greatly simplifies the task for the user by reducing the
     amount of information they need to provide.  For example, when creating an auto-scaling-group ("asg")
     for a cluster, the asg needs to know about the cluster both for its launch-configuration's security-groups,
     and also to initialize the `userData` for the cloud-formation stack with the ID of the cluster for 
     so that the asg can appropriately signal that the cluster is ok as it launches instances.  In this 
     sitaution, a user can always manually create an asg and pass it information about the cluster.  However,
     it is also sensible to be able to ask the cluster itself to provdie an asg with those values suitably
     filled in so that the user does not need to know all the places they need to pass this data along.
     
1. When sensible, allow components to expose 'runtime' intance methods that help with complex functionality.
   This shoudl generally only be provided when there is substantial complexity in calling the underlying
   `aws-sdk` functions, and the component can greatly simplify that.  For example, the `aws-sdk` exposes a 
   `sdk.ecs.runTask`. However, this function requires the user to pass along a lot of information that we 
   can automatically compute on their behalf (like `placementContraints`, `networkConfiguration` and `launchType`).
   In this case, there is a substanctive reduction in effort and cognitive load by providing a more convenient
   entry-point ourselves that takes care of this for the user.
     
1. When a resource has properties that logically are related to some other resource, expose the 
   property both in its raw form, but also through a callback-style interface that allows just passing
   in that other resource (or anything else) that could supply the data.  For example, `aws.ecs.Service`
   has a `loadBalancers` property that contains complex information pointing to both an elb and a target
   group. Forcing a user to figure out what should go here is tedious and error-prone.  To alleviate
   this, `awsinfr.ecs.Service` allows users to pass in that same data (so that the user is always in control)
   but also allows passing in `ServiceLoadBalancers` interface that can compute this information.  This
   interface is the `Service`s way of describing a point where data can be provided by a knowledgable 
   resource.  Our actual 'Load Balancers' can then implement this interface, allowing someone to 
   create a Service easily by just passing it an appropriate implementation.  
   * Naming for these 'provider data' points should be 'ResourceName + propertyName'.  For example: 
   `Service + loadBalancers = ServiceLoadBalancers`.  `Container + image = ContainerImage`.  This helps
   indicate that this is an interface that is used for a particular resource's needs as opposed to
   being a general purpose entity (which 'LoadBalance' or 'Image') might convey.
