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

// Package main is the entry point for the pulumi-gen-awsx code generation tool.
package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	"github.com/pulumi/pulumi-terraform-bridge/v3/pkg/tfgen/schemafilter"
	dotnetgen "github.com/pulumi/pulumi/pkg/v3/codegen/dotnet"
	gogen "github.com/pulumi/pulumi/pkg/v3/codegen/go"
	nodegen "github.com/pulumi/pulumi/pkg/v3/codegen/nodejs"
	pygen "github.com/pulumi/pulumi/pkg/v3/codegen/python"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"

	gen "github.com/pulumi/pulumi-awsx/provider/v3/pkg/schemagen"
	"github.com/pulumi/pulumi-awsx/provider/v3/pkg/version"
)

// Tool is the name of the code generation tool.
const (
	Tool       = "pulumi-gen-awsx"
	packageDir = "awsx"
)

// Language is the SDK language.
type Language string

// Supported SDK language targets.
const (
	DotNet Language = "dotnet"
	Go     Language = "go"
	Java   Language = "java"
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
	case "java":
		return Java, nil
	case "python":
		return Python, nil
	case "nodejs":
		return Nodejs, nil
	case "schema":
		return Schema, nil
	default:
		allLangs := []Language{DotNet, Go, Java, Python, Schema, Nodejs}
		allLangStrings := []string{}
		for _, lang := range allLangs {
			allLangStrings = append(allLangStrings, string(lang))
		}
		all := strings.Join(allLangStrings, ", ")
		return "", fmt.Errorf(`invalid language: %q, supported values include: %s`, text, all)
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

	// The checked-in schema is the all-language docs source of truth. Filter it per SDK target
	// before generation so chooser blocks and inflected identifiers don't leak into every SDK.
	filteredSpec, filteredSchemaJSON, err := filterSchema(pkgSpec, version.Version, language)
	if err != nil {
		return err
	}

	switch language {
	case DotNet:
		schema, err := bindSchema(filteredSpec)
		if err != nil {
			return err
		}
		return genDotNet(schema, outDir)
	case Go:
		schema, err := bindSchema(filteredSpec)
		if err != nil {
			return err
		}
		return genGo(schema, outDir)
	case Java:
		return genJava(filteredSchemaJSON, outDir)
	case Python:
		schema, err := bindSchema(filteredSpec)
		if err != nil {
			return err
		}
		return genPython(schema, outDir)
	case Nodejs:
		schema, err := bindSchema(filteredSpec)
		if err != nil {
			return err
		}
		return genNodejs(schema, outDir)
	default:
		return fmt.Errorf("unrecognized language %q", language)
	}
}

func filterSchema(pkgSpec schema.PackageSpec, version string, language Language) (schema.PackageSpec, []byte, error) {
	pkgSpec.Version = version
	schemaJSON, err := json.Marshal(pkgSpec)
	if err != nil {
		return schema.PackageSpec{}, nil, errors.Wrap(err, "marshaling Pulumi schema")
	}

	filteredSchemaJSON := schemafilter.FilterSchemaByLanguage(schemaJSON, string(language))

	var filteredSpec schema.PackageSpec
	if err := json.Unmarshal(filteredSchemaJSON, &filteredSpec); err != nil {
		return schema.PackageSpec{}, nil, errors.Wrap(err, "unmarshaling filtered Pulumi schema")
	}

	return filteredSpec, filteredSchemaJSON, nil
}

func bindSchema(pkgSpec schema.PackageSpec) (*schema.Package, error) {
	pkg, err := schema.ImportSpec(pkgSpec, nil, schema.ValidationOptions{})
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

// Java still uses the Pulumi CLI SDK generator, but it now consumes the same filtered
// per-language schema contract as the in-process generators above.
func genJava(filteredSchemaJSON []byte, outdir string) error {
	tempDir, err := os.MkdirTemp("", "pulumi-gen-awsx-java-schema")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tempDir)

	schemaPath := filepath.Join(tempDir, "schema.json")
	if err := os.WriteFile(schemaPath, filteredSchemaJSON, 0o600); err != nil {
		return err
	}

	cliOutDir := filepath.Join(tempDir, "sdk")
	args := []string{
		"package", "gen-sdk",
		"--language", string(Java),
		"--out", cliOutDir,
	}
	if version.Version != "" {
		args = append(args, "--version", version.Version)
	}
	args = append(args, schemaPath)

	cmd := exec.Command("pulumi", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return errors.Wrap(err, string(output))
	}

	generatedOutDir := filepath.Join(cliOutDir, string(Java))
	if _, err := os.Stat(generatedOutDir); err != nil {
		if !os.IsNotExist(err) {
			return err
		}
		generatedOutDir = cliOutDir
	}

	return copyGeneratedFiles(generatedOutDir, outdir)
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
	root := filepath.Join(outdir, "..", "..", "awsx-classic")
	err := filepath.Walk(root, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if info.Name() == "index.ts" || !strings.HasSuffix(info.Name(), ".ts") {
			return nil
		}
		for _, s := range []string{"/tests/", "/node_modules/", "/bin/"} {
			if strings.Contains(path, s) {
				return nil
			}
		}
		content, err := os.ReadFile(path) //nolint:gosec
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		extraFiles[filepath.Join("classic", rel)] = content
		return nil
	})
	if err != nil {
		return err
	}
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

func copyGeneratedFiles(srcRoot, dstRoot string) error {
	return filepath.Walk(srcRoot, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		contents, err := os.ReadFile(path) //nolint:gosec
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(srcRoot, path)
		if err != nil {
			return err
		}
		return writeFile(dstRoot, rel, contents)
	})
}

func writeFile(rootDir, filename string, contents []byte) error {
	outPath := filepath.Join(rootDir, filename)
	if err := os.MkdirAll(filepath.Dir(outPath), 0750); err != nil {
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
