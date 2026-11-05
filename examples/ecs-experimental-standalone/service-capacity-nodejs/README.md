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
Instances variant uses AWS Native for the capacity provider and association,
delegating provisioning and creation stabilization to Cloud Control. Both variants
create capacity and services in a single `pulumi up`.

Both use private subnets
and a NAT gateway for image pulls and logging. These resources incur costs.
Run `pulumi destroy` when finished.

The acceptance tests `TestAccEcsServiceEC2` and
`TestAccEcsServiceManagedInstances` deploy capacity and services in a single update
and check a no-change preview. Service creation waits for steady state through the
AWS provider. Strategy wiring is covered by unit tests. These acceptance tests do
not test changing capacity strategies or migrating between compute families. Inherited custom-provider validation reads Cloud Control, so
the deployment identity needs the corresponding read permissions.
