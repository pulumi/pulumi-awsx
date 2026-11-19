import {
  resolveRegions,
  resolveRevisionWeights,
  WebFunctionEndpointType,
} from '../../src/lambda/webFunctionEndpoint';

test('defaults a single revision to 100% and preserves an explicit traffic split', () => {
  expect(resolveRevisionWeights([{ revisionId: 'stable' }])).toEqual([
    { revisionId: 'stable', weight: 100 },
  ]);
  const split = [
    { revisionId: 'stable', weight: 90 },
    { revisionId: 'candidate', weight: 10 },
  ];
  expect(resolveRevisionWeights(split)).toEqual(split);
});

test('rejects ambiguous or invalid traffic splits', () => {
  expect(() =>
    resolveRevisionWeights([{ revisionId: 'stable' }, { revisionId: 'candidate', weight: 10 }]),
  ).toThrow('Both weights are required');
  expect(() =>
    resolveRevisionWeights([
      { revisionId: 'stable', weight: 90 },
      { revisionId: 'candidate', weight: 9 },
    ]),
  ).toThrow('Revision weights must total 100');
  expect(() =>
    resolveRevisionWeights([
      { revisionId: 'stable', weight: 90 },
      { revisionId: 'stable', weight: 10 },
    ]),
  ).toThrow('Each revision ID must be nonempty and unique');
});

test('normalizes replicas relative to the AWS Native provider region', () => {
  const home = 'us-west-2';
  expect(
    resolveRegions(home, WebFunctionEndpointType.MULTI_REGION, [
      'eu-west-1',
      home,
      'ap-northeast-1',
      'eu-west-1',
    ]),
  ).toEqual(['ap-northeast-1', 'eu-west-1']);
  expect(resolveRegions(home, WebFunctionEndpointType.HOME_REGION, [home])).toBeUndefined();
  expect(() => resolveRegions(home, WebFunctionEndpointType.PER_REGION, [home])).toThrow(
    'require at least one Region other than the home Region',
  );
  expect(() => resolveRegions(home, WebFunctionEndpointType.HOME_REGION, ['eu-west-1'])).toThrow(
    'HomeRegion endpoints cannot serve additional Regions',
  );
});
