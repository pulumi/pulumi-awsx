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
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	dotnetgen "github.com/pulumi/pulumi/pkg/v3/codegen/dotnet"
	gogen "github.com/pulumi/pulumi/pkg/v3/codegen/go"
	nodegen "github.com/pulumi/pulumi/pkg/v3/codegen/nodejs"
	pygen "github.com/pulumi/pulumi/pkg/v3/codegen/python"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"

	gen "github.com/pulumi/pulumi-awsx/provider/v2/pkg/schemagen"
	"github.com/pulumi/pulumi-awsx/provider/v2/pkg/version"
)

const (
	Tool       = "pulumi-gen-awsx"
	packageDir = "awsx"
)

// Language is the SDK language.
type Language string

const (
	DotNet Language = "dotnet"
	Go     Language = "go"
	Python Language = "python"
	Schema Language = "schema"
	Nodejs Language = "nodejs"
)

func parseLanguage(text string) (Language, error) {
	switch text {
	case "dotnet":
		return DotNet, nil
	case "go":
		return Go, nil
	case "python":
		return Python, nil
	case "nodejs":
		return Nodejs, nil
	case "schema":
		return Schema, nil
	default:
		allLangs := []Language{DotNet, Go, Python, Schema, Nodejs}
		allLangStrings := []string{}
		for _, lang := range allLangs {
			allLangStrings = append(allLangStrings, string(lang))
		}
		all := strings.Join(allLangStrings, ", ")
		return "", fmt.Errorf(`Invalid language: %q, supported values include: %s`, text, all)
	}
}

func rootCmd() *cobra.Command {
	var outDir string
	cmd := &cobra.Command{
		Use:   Tool,
		Short: "Pulumi Package Schema and SDK generator for pulumi-awsx",
		Args: func(_ *cobra.Command, args []string) error {
			if len(args) != 1 {
				return fmt.Errorf("accepts %d arg(s), received %d", 1, len(args))
			}
			if _, err := parseLanguage(args[0]); err != nil {
				return err
			}
			return nil
		},
		RunE: func(_ *cobra.Command, args []string) error {
			cwd, err := os.Getwd()
			if err != nil {
				return err
			}
			lang, err := parseLanguage(args[0])
			if err != nil {
				return err
			}
			return generate(lang, cwd, outDir)
		},
	}
	cmd.PersistentFlags().StringVarP(&outDir, "out", "o", "", "Emit the generated code to this directory")
	return cmd
}

func generate(language Language, cwd, outDir string) error {
	pkgSpec := gen.GenerateSchema(filepath.Join(cwd, packageDir))
	if language == Schema {
		return writePulumiSchema(pkgSpec, outDir)
	}
	// Following Makefile expectations from the bridged providers re-generate the schema on the fly.
	// Once that is refactored could instead load a pre-generated schema from a file.
	schema, err := bindSchema(pkgSpec, version.Version)
	if err != nil {
		return err
	}
	switch language {
	case DotNet:
		return genDotNet(schema, outDir)
	case Go:
		return genGo(schema, outDir)
	case Python:
		return genPython(schema, outDir)
	case Nodejs:
		return genNodejs(schema, outDir)
	default:
		return fmt.Errorf("Unrecognized language %q", language)
	}
}

func bindSchema(pkgSpec schema.PackageSpec, version string) (*schema.Package, error) {
	pkgSpec.Version = version
	pkg, err := schema.ImportSpec(pkgSpec, nil)
	if err != nil {
		return nil, err
	}
	return pkg, nil
}

func genDotNet(pkg *schema.Package, outdir string) error {
	files, err := dotnetgen.GeneratePackage(Tool, pkg, map[string][]byte{}, nil)
	if err != nil {
		return err
	}
	return writeFiles(outdir, files)
}

func genGo(pkg *schema.Package, outdir string) error {
	files, err := gogen.GeneratePackage(Tool, pkg, nil)
	if err != nil {
		return err
	}
	return writeFiles(outdir, files)
}

func genPython(pkg *schema.Package, outdir string) error {
	files, err := pygen.GeneratePackage(Tool, pkg, map[string][]byte{}, nil)
	if err != nil {
		return err
	}
	return writeFiles(outdir, files)
}

func genNodejs(pkg *schema.Package, outdir string) error {
	extraFiles := map[string][]byte{}
	localDependencies := map[string]string{}
	files, err := nodegen.GeneratePackage(Tool, pkg, extraFiles, localDependencies, false, nil)
	if err != nil {
		return err
	}
	return writeFiles(outdir, files)
}

func writeFiles(rootDir string, files map[string][]byte) error {
	for filename, contents := range files {
		if err := writeFile(rootDir, filename, contents); err != nil {
			return err
		}
	}
	return nil
}

func writeFile(rootDir, filename string, contents []byte) error {
	outPath := filepath.Join(rootDir, filename)
	if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
		return err
	}
	err := os.WriteFile(outPath, contents, 0600)
	if err != nil {
		return err
	}
	return nil
}

func writePulumiSchema(pkgSpec schema.PackageSpec, outdir string) error {
	schemaJSON, err := json.MarshalIndent(pkgSpec, "", "    ")
	if err != nil {
		return errors.Wrap(err, "marshaling Pulumi schema")
	}
	return writeFile(outdir, "schema.json", schemaJSON)
}

func main() {
	if err := rootCmd().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
