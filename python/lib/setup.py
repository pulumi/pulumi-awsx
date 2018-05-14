# Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

"""The Pulumi Amazon Web Services (AWS) Infrastructure Components."""

from setuptools import setup, find_packages

setup(name='pulumi-aws-infra',
      version='${VERSION}',
      description='Pulumi infrastructure components for Amazon Web Services (AWS)',
      url='https://github.com/pulumi/pulumi-aws-infra',
      packages=find_packages(),
      install_requires=[
          'google==2.0.1',
          'grpcio==1.9.1',
          'six==1.11.0'
      ],
      zip_safe=False)
