import * as pulumi from '@pulumi/pulumi';
import type { ApplicationProtocolVersion } from './serviceLoadBalancer';

interface ListenerRulePriority {
  readonly attachmentName: string;
  readonly listenerArn: string;
  readonly priority: number;
}

/**
 * Validates production priorities after listener ARNs have resolved.
 *
 * @param rules The resolved listener rules requested by this service.
 */
export function validateListenerRulePriorities(rules: readonly ListenerRulePriority[]): void {
  const prioritiesByListener = new Map<string, Map<number, string>>();
  for (const { attachmentName, listenerArn, priority } of rules) {
    const priorities = prioritiesByListener.get(listenerArn) ?? new Map<number, string>();
    const owner = priorities.get(priority);
    if (owner !== undefined) {
      throw new pulumi.InputPropertyError({
        propertyPath: `loadBalancer.${attachmentName}.application.priority`,
        reason:
          `Attachments "${owner}" and "${attachmentName}" both use priority ${priority} ` +
          `on listener ${listenerArn}. Choose a different priority for each rule on the same listener.`,
      });
    }
    priorities.set(priority, attachmentName);
    prioritiesByListener.set(listenerArn, priorities);
  }
}

/**
 * Checks the listener requirement for HTTP/2 and gRPC backend connections.
 *
 * @param version The requested backend protocol version.
 * @param listenerProtocol The resolved frontend listener protocol.
 * @param propertyPath The public input path used in the diagnostic.
 */
export function validateTargetProtocolVersion(
  version: ApplicationProtocolVersion | undefined,
  listenerProtocol: string,
  propertyPath: string,
): void {
  if ((version === 'HTTP2' || version === 'GRPC') && listenerProtocol !== 'HTTPS') {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: 'HTTP_2 and GRPC require an HTTPS listener',
    });
  }
}
