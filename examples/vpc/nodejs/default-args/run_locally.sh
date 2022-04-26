#!/bin/sh


time pushd && \
  cd ../../../../ && \
  make install_provider install_nodejs_sdk && \
  popd && \
  yarn install && \
  yarn link @pulumi/awsx && \
  AWS_REGION=us-west-2 PATH=$PATH:~/src/pulumi-awsx/bin/ pulumi up -y

