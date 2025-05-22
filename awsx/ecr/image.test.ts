// Copyright 2016-2024, Pulumi Corporation.
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

import { removeTagFromRef } from "./image";

describe("removeTagFromRef", () => {
  it("should remove tag from standard ECR image reference", () => {
    const input =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/repository-29552ef:7a3c38f0-container@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    const expected =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/repository-29552ef@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    expect(removeTagFromRef(input)).toBe(expected);
  });

  it("should handle ECR references with nested repository paths", () => {
    const input =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/team/project/service:v1.0.0@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    const expected =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/team/project/service@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    expect(removeTagFromRef(input)).toBe(expected);
  });

  it("should handle complex but valid tag names", () => {
    const input =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-repo:1.0.0-alpha.1_build-123@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    const expected =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-repo@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    expect(removeTagFromRef(input)).toBe(expected);
  });

  it("should return original string if no tag is present", () => {
    const input =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-repo@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    expect(removeTagFromRef(input)).toBe(input);
  });

  it("should handle repository names with underscores and hyphens", () => {
    const input =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/my_repo-name:latest@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    const expected =
      "123456789012.dkr.ecr.us-west-2.amazonaws.com/my_repo-name@sha256:ccf572fa3e9a9b9316761f749c3020c5748e1c47052e5781eec04e0a53954428";
    expect(removeTagFromRef(input)).toBe(expected);
  });
});
