## 0.16.5 (unreleased)

- Supply easy mechanisms to add Internet and NAT gateways to a VPC.
- Change awsx.elasticloadbalancingv2.Listener.endpoint from a method to a property.
- Change awsx.apigateway.ProxyRoute.target to be a richer type to allow extensibility.
- Allow awsx.elasticloadbalancingv2.NetworkListener to be used as ProxyRoute.target to simply
  incoming APIGateway routes to a NetworkListener endpoint.
- Add support for arbitrary APIGateway integration routes (i.e. to any supported aws service).
  Note: this comes with a small breaking change where the names of some apigateway types have
  changed from ProxyXXX to IntegrationXXX.


## 0.16.4 (Release February 5, 2019)

- Renamed 'aws-infra' package to 'awsx'.
- Moved `aws.apigateway.x.Api` from `@pulumi/aws` into this package under the name `awsx.apigateway.Api`.

## 0.16.3 (Release January 25, 2019)

- Experimental abstractions have been promoted to supported abstractions.  see new modules for:
  - autoscaling
  - ec2
  - ecs
  - elasticloadbalancingv2

## 0.16.2 (Released December 5th, 2018)

### Improvements

- Add some experimental abstractions for Services and Tasks in the `experimental` module.

## 0.16.1 (Released Novemeber 13th, 2018)

### Improvements

- Fix an issue where passing a cluster to another component would fail in some cases.


