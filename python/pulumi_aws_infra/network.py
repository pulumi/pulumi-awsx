# Copyright 2016-2018, Pulumi Corporation.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from pulumi.resource import ComponentResource, ResourceOptions
from pulumi.errors import RunError
from pulumi_aws import ec2
from typing import List
from .util import get_aws_az


class Network(ComponentResource):
    """
    Network is a component resource representing a network configuration in AWS.
    Networks can consist of public and private subnets across a number of availability
    zones.
    """
    _default_network = None

    def __init__(self,
                 name,                               # type: str
                 number_of_availability_zones=None,  # type: int
                 use_private_subnets=None,           # type: bool
                 vpc_id=None,                        # type: str
                 subnet_ids=None,                    # type: List[str]
                 security_group_ids=None,            # type: List[str]
                 public_subnet_ids=None,             # type: List[str]
                 opts=None                           # type: ResourceOptions
                 ):
        """
        Constructs a new Network with the requested arguments.

        :param name The name of this network. Used to name all child resources.
        :param number_of_availability_zones The number of AZs to create subnets in.
        :param vpc_id The ID of the VPC that this network should be attached to, if one exists.
        :param subnet_ids The subnet IDs that make up this network, if they exist.
        :param security_group_ids The security group IDs attached to this network, if they exist.
        :param public_subnet_ids The IDs of the subnets that are public, if they exist.
        :param opts General Pulumi resource options.
        """
        ComponentResource.__init__(self, "aws-infra:network:Network", name, {
            "number_of_availability_zones": number_of_availability_zones,
            "use_private_subnets": use_private_subnets,
            "vpc_id": vpc_id,
            "subnet_ids": subnet_ids,
            "security_group_ids": security_group_ids,
            "public_subnet_ids": public_subnet_ids,
        }, opts)

        # Initialize all of our instance variables at the top, so that an IDE can figure
        # out what shape this class is supposed to have.
        self.vpc_id = vpc_id
        self.subnet_ids = subnet_ids
        self.use_private_subnets = use_private_subnets
        self.security_group_ids = security_group_ids
        self.public_subnet_ids = public_subnet_ids

        if self.vpc_id is not None:
            if self.subnet_ids is None:
                raise TypeError("subnet_ids argument must not be None")

            if self.security_group_ids is None:
                raise TypeError("security_group_ids must not be None")

            if self.public_subnet_ids is None:
                raise TypeError("public_subnet_ids argument must not be None")

            self.register_outputs({
                "vpc_id": self.vpc_id,
                "subnet_ids": self.subnet_ids,
                "use_private_subnets": self.use_private_subnets,
                "security_group_ids": self.security_group_ids,
                "public_subnet_ids": self.public_subnet_ids
            })
            return

        number_of_availability_zones = number_of_availability_zones or 2
        if number_of_availability_zones < 1 or number_of_availability_zones > 4:
            raise RunError("Unsupported number of available zones for Network: " + str(number_of_availability_zones))

        self.use_private_subnets = use_private_subnets or False
        vpc = ec2.Vpc(name,
                      cidr_block="10.10.0.0/16",
                      enable_dns_hostnames=True,
                      enable_dns_support=True,
                      tags={
                          "Name": name,
                      },
                      __opts__=ResourceOptions(parent=self))

        self.vpc_id = vpc.id
        self.security_group_ids = [vpc.default_security_group_id]

        internet_gateway = ec2.InternetGateway(name,
                                               vpc_id=vpc.id,
                                               tags={
                                                   "Name": name,
                                               },
                                               __opts__=ResourceOptions(parent=self))

        public_route_table = ec2.RouteTable(name,
                                            vpc_id=vpc.id,
                                            routes=[
                                                {
                                                    "cidrBlock": "0.0.0.0/0",
                                                    "gatewayId": internet_gateway.id
                                                }
                                            ],
                                            tags={
                                                "Name": name
                                            },
                                            __opts__=ResourceOptions(parent=self))

        self.subnet_ids = []
        self.public_subnet_ids = []
        for i in range(number_of_availability_zones):
            subnet_name = "%s-%d" % (name, i)

            # Create the subnet for this AZ - either public or private
            subnet = ec2.Subnet(subnet_name,
                                vpc_id=vpc.id,
                                availability_zone=get_aws_az(i),
                                cidr_block="10.10.%d.0/24" % i,
                                map_public_ip_on_launch=not self.use_private_subnets,
                                # Only assign public IP if we are exposing public subnets
                                tags={
                                    "Name": subnet_name,
                                },
                                __opts__=ResourceOptions(parent=self))

            # We will use a different route table for this subnet depending on
            # whether we are in a public or private subnet
            if self.use_private_subnets:
                # We need a public subnet for the NAT Gateway
                nat_name = "%s-nat-%d" % (name, i)
                nat_gateway_public_subnet = ec2.Subnet(nat_name,
                                                       vpc_id=vpc.id,
                                                       availability_zone=get_aws_az(i),
                                                       # Use top half of the subnet space
                                                       cidr_block="10.10.%d.0/24" % (i + 64),
                                                       # Always assign a public IP in NAT subnet
                                                       map_public_ip_on_launch=True,
                                                       tags={
                                                           "Name": nat_name
                                                       },
                                                       __opts__=ResourceOptions(parent=self))

                # And we need to route traffic from that public subnet to the Internet Gateway
                nat_gateway_routes = ec2.RouteTableAssociation(nat_name,
                                                               subnet_id=nat_gateway_public_subnet.id,
                                                               route_table_id=public_route_table.id,
                                                               __opts__=ResourceOptions(parent=self))

                self.public_subnet_ids.append(nat_gateway_public_subnet.id)

                # We need an Elastic IP for the NAT Gateway
                eip = ec2.Eip(nat_name, __opts__=ResourceOptions(parent=self))

                # And we need a NAT Gateway to be able to access the Internet
                nat_gateway = ec2.NatGateway(nat_name,
                                             subnet_id=nat_gateway_public_subnet.id,
                                             allocation_id=eip.id,
                                             tags={
                                                 "Name": nat_name
                                             },
                                             __opts__=ResourceOptions(parent=self, depends_on=[nat_gateway_routes]))

                nat_route_table = ec2.RouteTable(nat_name,
                                                 vpc_id=vpc.id,
                                                 routes=[
                                                     {
                                                         "cidrBlock": "0.0.0.0/0",
                                                         "natGatewayId": nat_gateway.id
                                                     }
                                                 ],
                                                 tags={
                                                     "Name": name
                                                 },
                                                 __opts__=ResourceOptions(parent=self))

                # Route through the NAT gateway for the private subnet
                subnet_route_table = nat_route_table
            else:  # not self.private_subnets
                # Route directly to the Internet Gateway for the public subnet
                subnet_route_table = public_route_table

                # The subnet is public, so register it as our public subnet
                self.public_subnet_ids.append(subnet.id)

            route_table_association = ec2.RouteTableAssociation("%s-%d" % (name, i),
                                                                subnet_id=subnet.id,
                                                                route_table_id=subnet_route_table.id,
                                                                __opts__=ResourceOptions(parent=self))

            self.subnet_ids.append(subnet.id)
        self.register_outputs({
            "vpc_id": self.vpc_id,
            "subnet_ids": self.subnet_ids,
            "use_private_subnets": self.use_private_subnets,
            "security_group_ids": self.security_group_ids,
            "public_subnet_ids": self.public_subnet_ids
        })

    @staticmethod
    def get_default(resource_options=None):
        # type: (ResourceOptions) -> Network
        """
        Gets the default VPC for the AWS account as a Network.  This first time this is called,
        the default network will be lazily created, using whatever options are provided in opts.
        All subsequent calls will return that same network even if different opts are provided.
        """
        if Network._default_network is None:
            vpc = ec2.get_vpc(default=True)
            subnets = ec2.get_subnet_ids(vpc_id=vpc.id)
            default_security_group = ec2.get_security_group(name="default", vpc_id=vpc.id)
            net = Network.from_vpc("default-vpc",
                                   vpc_id=vpc.id,
                                   subnet_ids=subnets.ids,
                                   use_private_subnets=False,
                                   security_group_ids=[default_security_group.id],
                                   public_subnet_ids=subnets.ids,
                                   opts=resource_options)

            Network._default_network = net
            return net

        return Network._default_network

    @staticmethod
    def from_vpc(name,
                 vpc_id,                    # type: str
                 subnet_ids,                # type: List[str]
                 security_group_ids,        # type: List[str]
                 public_subnet_ids,         # type: List[str]
                 use_private_subnets=None,  # type: bool
                 opts=None                  # type: ResourceOptions
                 ):
        # type: (...) -> Network
        """
        Constructs a Network from a VPC that already exists.
        """
        if vpc_id is None:
            raise TypeError("vpc_id argument must be provided")

        if subnet_ids is None:
            raise TypeError("subnet_ids argument must be provided")

        if security_group_ids is None:
            raise TypeError("security_group_ids must be provided")

        if public_subnet_ids is None:
            raise TypeError("public_subnet_ids argument must be provided")

        return Network(name,
                       vpc_id=vpc_id,
                       subnet_ids=subnet_ids,
                       use_private_subnets=use_private_subnets,
                       security_group_ids=security_group_ids,
                       public_subnet_ids=public_subnet_ids,
                       opts=opts)
