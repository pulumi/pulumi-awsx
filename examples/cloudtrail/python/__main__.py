"""A Python Pulumi program"""

import pulumi
import pulumi_awsx as awsx

trail = awsx.cloudtrail.Trail("awsx-py-cloudtrail", enable_logging=True)

