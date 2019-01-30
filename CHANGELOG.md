## 0.16.4 (unreleased)

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


