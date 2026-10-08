import * as pulumi from '@pulumi/pulumi';

export interface ComponentIdentity {
  type: string;
  aliases: pulumi.Alias[];
}
