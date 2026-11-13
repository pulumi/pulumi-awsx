// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.

// Package docgen enriches a local schema with Markdown and YAML-authored examples.
// It never deploys the example programs.
package docgen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/pgavlin/goldmark"
	"github.com/pgavlin/goldmark/ast"
	"github.com/pgavlin/goldmark/text"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	pkghost "github.com/pulumi/pulumi/pkg/v3/host"
	"github.com/pulumi/pulumi/pkg/v3/resource/plugin"
	"github.com/pulumi/pulumi/sdk/v3/go/common/diag"
	"github.com/pulumi/pulumi/sdk/v3/go/common/diag/colors"
)

var languages = []struct{ runtime, fence string }{
	{"nodejs", "typescript"}, {"python", "python"}, {"go", "go"},
	{"dotnet", "csharp"}, {"java", "java"},
}

// BuildFile enriches a schema file without overwriting the input.
func BuildFile(schemaPath, docsDir, out string) error {
	inputPath, err := filepath.Abs(schemaPath)
	if err != nil {
		return err
	}
	outputPath, err := filepath.Abs(out)
	if err != nil {
		return err
	}
	if inputPath == outputPath {
		return fmt.Errorf("input and output schema paths must differ")
	}
	raw, err := os.ReadFile(inputPath)
	if err != nil {
		return err
	}
	var spec schema.PackageSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		return err
	}
	if err := Enrich(&spec, docsDir); err != nil {
		return err
	}
	result, err := json.MarshalIndent(spec, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(outputPath, append(result, '\n'), 0o600)
}

// Discover maps module/Component.md paths to package:module:Component tokens.
// Root Markdown files, including the authoring README, are not component docs.
func Discover(packageName, docsDir string) (map[string]string, error) {
	resources := map[string]string{}
	err := filepath.WalkDir(docsDir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || filepath.Ext(path) != ".md" {
			return nil
		}
		relative, err := filepath.Rel(docsDir, path)
		if err != nil {
			return err
		}
		module := filepath.ToSlash(filepath.Dir(relative))
		if module == "." {
			return nil
		}
		name := strings.TrimSuffix(filepath.Base(path), ".md")
		token := packageName + ":" + module + ":" + name
		resources[token] = path
		return nil
	})
	return resources, err
}

// Enrich applies discovered documentation to a schema in memory. Unknown resource
// tokens are errors, so misspelled paths cannot silently omit documentation.
func Enrich(spec *schema.PackageSpec, docsDir string) error {
	resources, err := Discover(spec.Name, docsDir)
	if err != nil {
		return err
	}
	for token := range resources {
		if _, ok := spec.Resources[token]; !ok {
			return fmt.Errorf("documented resource %q is absent from the local schema", token)
		}
	}
	if len(resources) == 0 {
		return nil
	}
	return withExampleConverter(spec, func(generate func(docExample) (string, error)) error {
		tokens := make([]string, 0, len(resources))
		for token := range resources {
			tokens = append(tokens, token)
		}
		sort.Strings(tokens)
		for _, token := range tokens {
			fmt.Fprintf(os.Stderr, "Building component documentation %s\n", resources[token])
			markdown, err := os.ReadFile(resources[token])
			if err != nil {
				return err
			}
			rendered, err := renderExampleFences(string(markdown), func(source, fixture string) (string, error) {
				example, err := prepareExample(source, fixture, filepath.Dir(resources[token]))
				if err != nil {
					return "", err
				}
				return generate(example)
			})
			if err != nil {
				return fmt.Errorf("%s: %w", resources[token], err)
			}
			resource := spec.Resources[token]
			resource.Description = rendered
			spec.Resources[token] = resource
		}
		return nil
	})
}

// withConverter shares a local-schema loader and caches converted programs across
// the Markdown files in one build. Conversion and publication rendering stay separate.
func withConverter(spec *schema.PackageSpec, render func(func(string) (string, error)) error) error {
	return withExampleConverter(spec, func(generate func(docExample) (string, error)) error {
		return render(func(source string) (string, error) {
			return generate(docExample{program: source, display: source})
		})
	})
}

func withExampleConverter(spec *schema.PackageSpec, render func(func(docExample) (string, error)) error) error {
	ctx := context.Background()
	sink := diag.DefaultSink(os.Stderr, os.Stderr, diag.FormatOptions{Color: colors.Never})
	host, err := pkghost.New(ctx, sink, sink, nil, nil, schema.NewLoaderServerFromContext, nil, nil)
	if err != nil {
		return err
	}
	defer host.Close()
	cwd, err := os.Getwd()
	if err != nil {
		return err
	}
	pctx, err := plugin.NewContext(ctx, sink, sink, host, nil, cwd, nil, false, nil)
	if err != nil {
		return err
	}
	defer pctx.Close()
	fallback := schema.NewPluginLoader(pctx)
	loader, err := newLocalLoader(spec, fallback)
	if err != nil {
		return fmt.Errorf("prepare local schema: %w", err)
	}
	server, err := plugin.NewServer(pctx, schema.LoaderRegistration(schema.NewLoaderServer(loader)))
	if err != nil {
		return err
	}
	defer server.Close()
	converter, err := plugin.NewConverter(pctx, "yaml", nil)
	if err != nil {
		return fmt.Errorf("load YAML converter, install with 'pulumi plugin install converter yaml': %w", err)
	}
	defer converter.Close()

	cache := map[string]string{}
	return render(func(example docExample) (string, error) {
		key, err := json.Marshal(example.cacheKey())
		if err != nil {
			return "", err
		}
		if value, ok := cache[string(key)]; ok {
			return value, nil
		}
		value, err := convertExample(pctx, converter, server.Addr(), example)
		if err == nil {
			cache[string(key)] = value
		}
		return value, err
	})
}

// renderExamples converts annotated YAML fences, leaving ordinary code blocks alone.
func renderExamples(markdown string, generate func(string) (string, error)) (string, error) {
	return renderExampleFences(markdown, func(source, fixture string) (string, error) {
		if fixture != "" {
			return "", fmt.Errorf("fixtures are supported only in component documentation")
		}
		return generate(source)
	})
}

func renderExampleFences(markdown string, generate func(string, string) (string, error)) (string, error) {
	source := []byte(markdown)
	document := goldmark.New().Parser().Parse(text.NewReader(source))
	var result strings.Builder
	cursor := 0
	err := ast.Walk(document, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		block, ok := node.(*ast.FencedCodeBlock)
		if !entering || !ok || block.Info == nil {
			return ast.WalkContinue, nil
		}
		fields := strings.Fields(string(block.Info.Text(source)))
		if len(fields) < 2 || fields[0] != "yaml" || fields[1] != "pulumi-example" {
			return ast.WalkContinue, nil
		}
		fixture := ""
		if len(fields) > 2 {
			if len(fields) != 3 || !strings.HasPrefix(fields[2], "fixture=") ||
				strings.TrimPrefix(fields[2], "fixture=") == "" {
				return ast.WalkStop, fmt.Errorf("expected yaml pulumi-example fixture=relative/path.yaml")
			}
			fixture = strings.TrimPrefix(fields[2], "fixture=")
		}
		if block.Parent() != document {
			return ast.WalkStop, fmt.Errorf("pulumi-example fences must be top-level blocks")
		}
		start := strings.LastIndex(markdown[:block.Info.Segment.Start], "\n") + 1
		endOfLine := func(start int) int {
			if newline := strings.IndexByte(markdown[start:], '\n'); newline >= 0 {
				return start + newline + 1
			}
			return len(markdown)
		}
		closingStart := endOfLine(start)
		var yaml strings.Builder
		for i := 0; i < block.Lines().Len(); i++ {
			segment := block.Lines().At(i)
			yaml.Write(segment.Value(source))
			closingStart = segment.Stop
		}
		closingEnd := endOfLine(closingStart)
		closing := strings.TrimSpace(markdown[closingStart:closingEnd])
		fence := string(block.Fence)
		if len(closing) < len(fence) || strings.Trim(closing, fence[:1]) != "" {
			return ast.WalkStop, fmt.Errorf("unterminated pulumi-example fence")
		}
		if strings.TrimSpace(yaml.String()) == "" {
			return ast.WalkStop, fmt.Errorf("empty pulumi-example fence")
		}
		example, err := generate(yaml.String(), fixture)
		if err != nil {
			return ast.WalkStop, fmt.Errorf(
				"inline example at line %d: %w",
				strings.Count(markdown[:start], "\n")+1,
				err,
			)
		}
		result.WriteString(markdown[cursor:start])
		result.WriteString(example)
		cursor = closingEnd
		return ast.WalkContinue, nil
	})
	if err != nil {
		return "", err
	}
	result.WriteString(markdown[cursor:])
	return result.String(), nil
}

func convertExample(
	pctx *plugin.Context,
	converter plugin.Converter,
	loaderTarget string,
	example docExample,
) (string, error) {
	temp, err := os.MkdirTemp("", "awsx-docs-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(temp)
	source := filepath.Join(temp, "source")
	target := filepath.Join(temp, "pcl")
	if err := os.MkdirAll(source, 0o700); err != nil {
		return "", err
	}
	if err := os.MkdirAll(target, 0o700); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(source, "Pulumi.yaml"), []byte(example.program), 0o600); err != nil {
		return "", err
	}
	response, err := converter.ConvertProgram(pctx.Request(), &plugin.ConvertProgramRequest{
		SourceDirectory: source, TargetDirectory: target, LoaderTarget: loaderTarget,
	})
	if err != nil {
		return "", err
	}
	if response.Diagnostics.HasErrors() {
		return "", fmt.Errorf("YAML conversion failed: %v", response.Diagnostics)
	}
	program := map[string]string{}
	err = filepath.WalkDir(target, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".pp" {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		name, err := filepath.Rel(target, path)
		if err != nil {
			return err
		}
		program[filepath.ToSlash(name)] = string(content)
		return nil
	})
	if err != nil {
		return "", err
	}
	if len(program) == 0 {
		return "", fmt.Errorf("YAML converter produced no PCL files")
	}
	if err := normalizeObjectKeys(program); err != nil {
		return "", err
	}
	boundaries := example.visible
	if example.visible != nil {
		boundaries, err = markResourceBoundaries(program, example.visible)
		if err != nil {
			return "", err
		}
	}
	var result strings.Builder
	result.WriteString(beginChooser + "\n\n")
	for _, language := range languages {
		fmt.Fprintf(os.Stderr, "Generating %s documentation example\n", language.fence)
		files, err := generateLanguage(pctx, program, loaderTarget, language.runtime)
		if err != nil {
			return "", fmt.Errorf("generate %s: %w", language.fence, err)
		}
		if len(files) == 0 {
			return "", fmt.Errorf("%s generator produced no source files", language.fence)
		}
		names := make([]string, 0, len(files))
		for name := range files {
			names = append(names, name)
		}
		sort.Strings(names)
		for _, name := range names {
			code := string(files[name])
			if strings.Contains(code, "%!v(PANIC=") {
				return "", fmt.Errorf("%s generator emitted a formatting panic: %s", language.fence, code)
			}
			if example.visible != nil {
				code, err = selectResources(code, boundaries)
				if err != nil {
					return "", fmt.Errorf("select %s snippet: %w", language.fence, err)
				}
			}
			writeFence(&result, language.fence, code)
		}
	}
	writeFence(&result, "yaml", example.display)
	result.WriteString(endChooser + "\n")
	return result.String(), nil
}

// generateLanguage bypasses Host.LanguageRuntime's process cache. A fresh process
// per invocation bounds the lifetime of code generators' package-graph caches,
// including Go's global cache keyed by schema object identity.
func generateLanguage(
	pctx *plugin.Context,
	program map[string]string,
	loaderTarget, language string,
) (files map[string][]byte, err error) {
	runtime, err := plugin.NewLanguageRuntime(pctx.Host, pctx, language, pctx.Pwd)
	if err != nil {
		return nil, err
	}
	// Close on both RPC and diagnostic failures, not just successful generation.
	defer func() {
		if closeErr := runtime.Close(); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close %s generator: %w", language, closeErr))
		}
	}()
	files, diagnostics, err := runtime.GenerateProgram(pctx.Request(), program, loaderTarget, true)
	if err != nil {
		return nil, err
	}
	if diagnostics.HasErrors() {
		return nil, fmt.Errorf("%v", diagnostics)
	}
	return files, nil
}

func writeFence(out *strings.Builder, language, code string) {
	fence := "```"
	for strings.Contains(code, fence) {
		fence += "`"
	}
	fmt.Fprintf(out, "%s%s\n%s\n%s\n\n", fence, language, strings.TrimRight(code, "\n"), fence)
}
