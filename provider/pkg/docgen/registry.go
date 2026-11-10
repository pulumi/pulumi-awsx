// Copyright 2024-2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.

package docgen

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/pgavlin/goldmark"
	"github.com/pgavlin/goldmark/ast"
	"github.com/pgavlin/goldmark/text"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

// Adapted from pulumi/registry, tools/resourcedocsgen/pkg/docs/templates/examples.tmpl
// and description.go, under Apache-2.0. Keep the chooser/choosable structure aligned
// with those sources. Unlike the full resource template, this preserves the page's
// authored headings and emits only languages for which snippets exist.
// Upstream revision f4530ec993677ea530e458bb9a2ef4ada7a4c8dc:
// https://github.com/pulumi/registry/blob/f4530ec993677ea530e458bb9a2ef4ada7a4c8dc/tools/resourcedocsgen/pkg/docs/templates/examples.tmpl
var registryExampleTemplate = template.Must(template.New("example").Parse(`<div><pulumi-examples>
<div><pulumi-chooser type="language" options="{{ .Languages }}"></pulumi-chooser></div>
{{ range .Snippets }}
<div><pulumi-choosable type="language" values="{{ .Language }}">

{{ .Code }}
</pulumi-choosable></div>
{{ end }}
</pulumi-examples></div>
`))

var registryLanguages = []string{"typescript", "python", "go", "csharp", "java", "yaml", "hcl"}

// renderRegistryExample renders the same language-tagged fences that resourcedocsgen
// reads from a schema description. This layer performs no language conversion.
func renderRegistryExample(markdown string) (string, error) {
	source := []byte(markdown)
	document := goldmark.New().Parser().Parse(text.NewReader(source))
	snippets := map[string]string{}
	err := ast.Walk(document, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		block, ok := node.(*ast.FencedCodeBlock)
		if !entering || !ok {
			return ast.WalkContinue, nil
		}
		language := string(block.Language(source))
		if language == "" {
			return ast.WalkStop, fmt.Errorf("example snippet is missing its language")
		}
		if _, exists := snippets[language]; exists {
			return ast.WalkStop, fmt.Errorf("duplicate %s snippet in one example", language)
		}
		var code, fenced strings.Builder
		for i := 0; i < block.Lines().Len(); i++ {
			segment := block.Lines().At(i)
			code.Write(segment.Value(source))
		}
		writeFence(&fenced, language, code.String())
		snippets[language] = fenced.String()
		return ast.WalkSkipChildren, nil
	})
	if err != nil {
		return "", err
	}
	var data struct {
		Languages string
		Snippets  []struct{ Language, Code string }
	}
	var present []string
	for _, language := range registryLanguages {
		if code, ok := snippets[language]; ok {
			present = append(present, language)
			data.Snippets = append(data.Snippets, struct{ Language, Code string }{language, code})
			delete(snippets, language)
		}
	}
	if len(snippets) != 0 {
		return "", fmt.Errorf("unsupported snippet languages: %v", snippets)
	}
	if len(present) == 0 {
		return "", fmt.Errorf("example contains no language snippets")
	}
	data.Languages = strings.Join(present, ",")
	var result strings.Builder
	if err := registryExampleTemplate.Execute(&result, data); err != nil {
		return "", err
	}
	return result.String(), nil
}

const (
	beginChooser = "<!--Start PulumiCodeChooser -->"
	endChooser   = "<!--End PulumiCodeChooser -->"
)

// renderLandingMarkdown converts annotated YAML, then formats the resulting
// snippets for the registry. Optional legacy chooser markers group generated
// snippets with an explicitly authored extra language, such as the existing HCL
// example. Markers inside ordinary code blocks are left untouched.
func renderLandingMarkdown(markdown string, generate func(string) (string, error)) (string, error) {
	renderInline := func(markdown string) (string, error) {
		return renderExamples(markdown, func(yaml string) (string, error) {
			converted, err := generate(yaml)
			if err != nil {
				return "", err
			}
			return renderRegistryExample(converted)
		})
	}
	source := []byte(markdown)
	document := goldmark.New().Parser().Parse(text.NewReader(source))
	type marker struct {
		start, end int
		opening    bool
	}
	var markers []marker
	err := ast.Walk(document, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		block, ok := node.(*ast.HTMLBlock)
		if !entering || !ok {
			return ast.WalkContinue, nil
		}
		start, end := -1, -1
		if block.Lines().Len() != 0 {
			start = block.Lines().At(0).Start
			end = block.Lines().At(block.Lines().Len() - 1).Stop
		}
		if block.HasClosure() {
			if start < 0 {
				start = block.ClosureLine.Start
			}
			end = block.ClosureLine.Stop
		}
		if start < 0 {
			return ast.WalkContinue, nil
		}
		value := strings.TrimSpace(markdown[start:end])
		if value != beginChooser && value != endChooser {
			if strings.HasPrefix(value, beginChooser) || strings.HasPrefix(value, endChooser) {
				return ast.WalkStop, fmt.Errorf("chooser markers must occupy separate lines")
			}
			return ast.WalkContinue, nil
		}
		if block.Parent() != document {
			return ast.WalkStop, fmt.Errorf("chooser groups must be top-level Markdown blocks")
		}
		markers = append(markers, marker{start, end, value == beginChooser})
		return ast.WalkContinue, nil
	})
	if err != nil {
		return "", err
	}
	var result strings.Builder
	cursor := 0
	for i := 0; i < len(markers); i += 2 {
		opening := markers[i]
		if !opening.opening {
			return "", fmt.Errorf("unmatched chooser end marker")
		}
		if i+1 == len(markers) {
			return "", fmt.Errorf("unterminated chooser group")
		}
		closing := markers[i+1]
		if closing.opening {
			return "", fmt.Errorf("nested chooser groups are unsupported")
		}
		prefix, err := renderInline(markdown[cursor:opening.start])
		if err != nil {
			return "", err
		}
		converted, err := renderExamples(markdown[opening.end:closing.start], generate)
		if err != nil {
			return "", err
		}
		rendered, err := renderRegistryExample(converted)
		if err != nil {
			return "", err
		}
		result.WriteString(prefix)
		result.WriteString(rendered)
		cursor = closing.end
	}
	remaining, err := renderInline(markdown[cursor:])
	if err != nil {
		return "", err
	}
	result.WriteString(remaining)
	return result.String(), nil
}

// GenerateLandingPages builds the registry's fetched pages from docs/source.
// It is independent of experimental component availability and validates every
// source before replacing any output, so conversion failures preserve old pages.
func GenerateLandingPages(spec *schema.PackageSpec, root string) error {
	return GenerateLandingPagesTo(spec, filepath.Join(root, "docs", "source"), filepath.Join(root, "docs"))
}

// GenerateLandingPagesTo writes landing pages outside the checkout for previews.
func GenerateLandingPagesTo(spec *schema.PackageSpec, sourceDir, outDir string) error {
	entries, err := os.ReadDir(sourceDir)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	pages := map[string]string{}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".md" {
			continue
		}
		name := entry.Name()
		if name != "_index.md" && name != "installation-configuration.md" {
			return fmt.Errorf("unsupported registry landing-page source %q", name)
		}
		source, err := os.ReadFile(filepath.Join(sourceDir, name))
		if err != nil {
			return err
		}
		pages[name] = string(source)
	}
	if len(pages) == 0 {
		return nil
	}
	err = withConverter(spec, func(generate func(string) (string, error)) error {
		// ReadDir returns filenames in sorted order. Use that order for diagnostics
		// and output rather than iterating maps.
		for _, entry := range entries {
			source, ok := pages[entry.Name()]
			if !ok {
				continue
			}
			rendered, err := renderLandingMarkdown(source, generate)
			if err != nil {
				return fmt.Errorf("%s: %w", filepath.Join(sourceDir, entry.Name()), err)
			}
			page, err := generatedLandingPage(entry.Name(), rendered)
			if err != nil {
				return err
			}
			pages[entry.Name()] = page
		}
		return nil
	})
	if err != nil {
		return err
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}
	for _, entry := range entries {
		page, ok := pages[entry.Name()]
		if !ok {
			continue
		}
		if err := os.WriteFile(filepath.Join(outDir, entry.Name()), []byte(page), 0o644); err != nil {
			return err
		}
	}
	return nil
}

func generatedLandingPage(name, body string) (string, error) {
	warning := "<!-- Generated from docs/source/" + name + "; do not edit directly. -->\n"
	// Front matter must remain the first bytes for Hugo to recognize it.
	newline := "\n"
	if strings.HasPrefix(body, "---\r\n") {
		newline = "\r\n"
	}
	opening := "---" + newline
	if !strings.HasPrefix(body, opening) {
		return warning + body, nil
	}
	closing := newline + "---" + newline
	end := strings.Index(body[len(opening):], closing)
	if end < 0 {
		return "", fmt.Errorf("%s: unterminated front matter", name)
	}
	boundary := len(opening) + end + len(closing)
	return body[:boundary] + newline + warning + body[boundary:], nil
}
