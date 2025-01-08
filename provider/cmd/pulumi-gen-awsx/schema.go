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

package main

import (
	"log"
	"os"
	"path/filepath"

	gen "github.com/pulumi/pulumi-awsx/provider/v2/pkg/schemagen"
	"github.com/spf13/cobra"
)

var outDir string

var schemaCommand = &cobra.Command{
	Use:   "schema",
	Short: "Generate the Pulumi Package Schema",
	Run: func(cmd *cobra.Command, args []string) {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatal(err)
		}
		pkgSpec := gen.GenerateSchema(filepath.Join(cwd, "awsx"))
		mustWritePulumiSchema(pkgSpec, outDir)
	},
}

func init() {
	schemaCommand.PersistentFlags().StringVarP(&outDir, "out", "o", "", "Emit the generated schema to this directory")

	rootCmd.AddCommand(schemaCommand)
}
