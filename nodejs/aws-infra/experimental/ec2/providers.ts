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

/**
 * A line that should be added to the [userData] section of a LaunchConfiguration template.
 */
export interface UserDataLine {
    /**
     * Actual contents of the line.
     */
    contents: string;

    /**
     * Whether the line should be automatically indented to the right level.  Defaults to [true].
     * Set explicitly to [false] to control all indentation.
     */
    automaticallyIndent?: boolean;
}

export interface ILaunchConfigurationUserDataProvider {
    extraBootcmdLines?(): pulumi.Input<UserDataLine[]>;
}
