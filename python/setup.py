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

from setuptools import setup, find_packages

setup(name='pulumi_aws_infra',
      version='${VERSION}',
      description='Pulumi Amazon Web Services (AWS) infrastructure components.',
      keywords='pulumi aws aws-infra',
      url='https://github.com/pulumi/pulumi-aws-infra',
      project_urls={
          'Repository': 'https://github.com/pulumi/pulumi-aws-infra'
      },
      packages=find_packages(),
      install_requires=[
          'typing>=3.6',
          'pulumi>=0.13.0,<0.15.0',
          'pulumi_aws>=0.13'
      ])
