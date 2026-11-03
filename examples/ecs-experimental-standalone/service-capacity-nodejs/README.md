# ECS capacity selection

Set `capacityType` to `ec2` or `managedInstances`. The program provisions one
capacity provider and deploys two small Linux workers. One selects the provider
explicitly, and the other adopts the cluster default. Neither uses a load balancer.

```sh
pulumi package add ../../../awsx-next
pulumi config set aws:region us-west-2
pulumi config set aws-native:region us-west-2
pulumi config set capacityType managedInstances
pulumi up
```

The EC2 variant owns its launch template and Auto Scaling group. The Managed
Instances variant delegates host provisioning to ECS. A newly created Managed
Instances provider can take time to become usable after the AWS resource creation
returns. Its acceptance test first deploys with `deployServices=false`, waits for
ECS to report ACTIVE and CREATE_COMPLETE, then enables services. For a manual
first deployment, use the same two phases if ECS reports the provider is not ACTIVE.

Both use private subnets
and a NAT gateway for image pulls and logging. These resources incur costs.
Run `pulumi destroy` when finished.

The acceptance tests `TestAccEcsServiceEC2` and
`TestAccEcsServiceManagedInstances` query ECS to verify both services reach steady
state and their running tasks use the selected provider, then check a no-change
preview. They do not test changing capacity strategies or migrating between
compute families. Inherited custom-provider validation reads Cloud Control, so
the deployment identity needs the corresponding read permissions.
