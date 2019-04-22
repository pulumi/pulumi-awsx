// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as pulumi from "@pulumi/pulumi";

pulumi.runtime.setConfig("aws:region", "us-east-2");

import * as assert from "assert";

import { convertLowerSteps, convertSteps, convertUpperSteps, ScalingStep, ScalingSteps } from "../../autoscaling/stepScaling";

function upperStepsJson(...steps: pulumi.Unwrap<ScalingStep>[]) {
    return JSON.stringify(convertUpperSteps(steps), null, 4);
}

function lowerStepsJson(...steps: pulumi.Unwrap<ScalingStep>[]) {
    return JSON.stringify(convertLowerSteps(steps), null, 4);
}

function stepsJson(steps: pulumi.Unwrap<ScalingSteps>) {
    return JSON.stringify(convertSteps(steps), null, 4);
}

describe("step scaling", () => {
    describe("upper steps", () => {
        it("throws on empty", () => {
            assert.throws(() => {
                convertUpperSteps([]);
            });
        });

        it("throws on duplicate", () => {
            assert.throws(() => stepsJson({
                upper: [{ value: 60, adjustment: 10 }, { value: 60, adjustment: 20 }],
            }));
        });

        it("single step", () => {
            assert.equal(upperStepsJson({ value: 100, adjustment: 10 }), `{
    "threshold": 100,
    "stepAdjustments": [
        {
            "metricIntervalLowerBound": "0",
            "scalingAdjustment": 10
        }
    ]
}`);
        });

        it("two steps", () => {
            assert.equal(upperStepsJson({ value: 100, adjustment: 10 },
                                        { value: 110, adjustment: 30 }), `{
    "threshold": 100,
    "stepAdjustments": [
        {
            "metricIntervalLowerBound": "0",
            "metricIntervalUpperBound": "10",
            "scalingAdjustment": 10
        },
        {
            "metricIntervalLowerBound": "10",
            "scalingAdjustment": 30
        }
    ]
}`);
        });

        it("two steps - flipped", () => {
            assert.equal(upperStepsJson({ value: 110, adjustment: 30 },
                                        { value: 100, adjustment: 10 }), `{
    "threshold": 100,
    "stepAdjustments": [
        {
            "metricIntervalLowerBound": "0",
            "metricIntervalUpperBound": "10",
            "scalingAdjustment": 10
        },
        {
            "metricIntervalLowerBound": "10",
            "scalingAdjustment": 30
        }
    ]
}`);
        });

        it("two steps - same value", () => {
            assert.throws(() => {
                upperStepsJson({ value: 100, adjustment: 30 },
                               { value: 100, adjustment: 10 });
            });
        });
    });

    describe("lower steps", () => {
        it("throws on empty", () => {
            assert.throws(() => {
                convertLowerSteps([]);
            });
        });

        it("throws on duplicate", () => {
            assert.throws(() => stepsJson({
                lower: [{ value: 60, adjustment: 10 }, { value: 60, adjustment: 20 }],
            }));
        });

        it("single step", () => {
            assert.equal(lowerStepsJson({ value: 100, adjustment: -10 }), `{
    "threshold": 100,
    "stepAdjustments": [
        {
            "metricIntervalUpperBound": "0",
            "scalingAdjustment": -10
        }
    ]
}`);
        });

        it("two steps", () => {
            assert.equal(lowerStepsJson({ value: 100, adjustment: -30 },
                                        { value: 110, adjustment: -10 }), `{
    "threshold": 110,
    "stepAdjustments": [
        {
            "metricIntervalUpperBound": "-10",
            "scalingAdjustment": -30
        },
        {
            "metricIntervalLowerBound": "-10",
            "metricIntervalUpperBound": "0",
            "scalingAdjustment": -10
        }
    ]
}`);
        });

        it("two steps - same value", () => {
            assert.throws(() => {
                lowerStepsJson({ value: 100, adjustment: 30 },
                               { value: 100, adjustment: 10 });
            });
        });

        it("two steps - flipped", () => {
            assert.equal(lowerStepsJson({ value: 110, adjustment: -10 },
                                        { value: 100, adjustment: -30 }), `{
    "threshold": 110,
    "stepAdjustments": [
        {
            "metricIntervalUpperBound": "-10",
            "scalingAdjustment": -30
        },
        {
            "metricIntervalLowerBound": "-10",
            "metricIntervalUpperBound": "0",
            "scalingAdjustment": -10
        }
    ]
}`);
        });
    });

    it("upper and lower", () => {
        assert.equal(stepsJson({
            upper: [{ value: 60, adjustment: 10 }, { value: 70, adjustment: 30 }],
            lower: [{ value: 40, adjustment: -10 }, { value: 30, adjustment: -30 }],
        }), `{
    "upper": {
        "threshold": 60,
        "stepAdjustments": [
            {
                "metricIntervalLowerBound": "0",
                "metricIntervalUpperBound": "10",
                "scalingAdjustment": 10
            },
            {
                "metricIntervalLowerBound": "10",
                "scalingAdjustment": 30
            }
        ]
    },
    "lower": {
        "threshold": 40,
        "stepAdjustments": [
            {
                "metricIntervalUpperBound": "-10",
                "scalingAdjustment": -30
            },
            {
                "metricIntervalLowerBound": "-10",
                "metricIntervalUpperBound": "0",
                "scalingAdjustment": -10
            }
        ]
    }
}`);
    });

    it("upper and lower flipped", () => {
        assert.equal(stepsJson({
            upper: [{ value: 70, adjustment: 30 }, { value: 60, adjustment: 10 }],
            lower: [{ value: 30, adjustment: -30 }, { value: 40, adjustment: -10 }],
        }), `{
    "upper": {
        "threshold": 60,
        "stepAdjustments": [
            {
                "metricIntervalLowerBound": "0",
                "metricIntervalUpperBound": "10",
                "scalingAdjustment": 10
            },
            {
                "metricIntervalLowerBound": "10",
                "scalingAdjustment": 30
            }
        ]
    },
    "lower": {
        "threshold": 40,
        "stepAdjustments": [
            {
                "metricIntervalUpperBound": "-10",
                "scalingAdjustment": -30
            },
            {
                "metricIntervalLowerBound": "-10",
                "metricIntervalUpperBound": "0",
                "scalingAdjustment": -10
            }
        ]
    }
}`);
    });

    it("throws on overlap 1", () => {
        assert.throws(() => stepsJson({
            upper: [{ value: 60, adjustment: 10 }],
            lower: [{ value: 70, adjustment: -10 }] }));
    });

    it("throws on overlap 1", () => {
        assert.throws(() => stepsJson({
            upper: [{ value: 60, adjustment: 10 }, { value: 80, adjustment: 10 }],
            lower: [{ value: 40, adjustment: -10 }, { value: 70, adjustment: -10 }] }));
    });

    it("throws on overlap 2", () => {
        assert.throws(() => stepsJson({
            upper: [{ value: 80, adjustment: 10 }, { value: 60, adjustment: 10 }],
            lower: [{ value: 70, adjustment: -10 }, { value: 40, adjustment: -10 }] }));
    });

    it("throws on overlap 3", () => {
        assert.throws(() => stepsJson({
            upper: [{ value: 60, adjustment: 10 }],
            lower: [{ value: 60, adjustment: -10 }] }));
    });
});
