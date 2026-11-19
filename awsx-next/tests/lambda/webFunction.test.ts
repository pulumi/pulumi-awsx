import * as pulumi from '@pulumi/pulumi';
import { executionRoleName, validateWebFunctionAccounts } from '../../src/lambda/webFunction';

const accountId = '123456789012';

test('rejects a cross-account AWS and AWS Native provider pair', () => {
  expect(() => validateWebFunctionAccounts(accountId, accountId)).not.toThrow();
  expect(() => validateWebFunctionAccounts(accountId, '210987654321')).toThrow(
    'AWS selects 123456789012; AWS Native selects 210987654321.',
  );
});

test.each(['existing', 'apps/prod/existing'])('extracts the IAM role name from %s', (path) => {
  expect(executionRoleName(`arn:aws:iam::${accountId}:role/${path}`, 'aws', accountId)).toBe(
    'existing',
  );
});

test.each([
  'arn:aws:iam::210987654321:role/existing',
  'arn:aws-cn:iam::123456789012:role/existing',
  'arn:aws:iam::123456789012:user/existing',
])('rejects an execution role that cannot safely be targeted: %s', (arn) => {
  expect(() => executionRoleName(arn, 'aws', accountId)).toThrow(pulumi.InputPropertyError);
});
