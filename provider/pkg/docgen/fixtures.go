// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.

package docgen

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclsyntax"
	"gopkg.in/yaml.v3"
)

type docExample struct {
	program string
	display string
	visible map[string]bool
}

func (e docExample) cacheKey() any {
	return struct {
		Program, Display string
		Visible          map[string]bool
	}{e.program, e.display, e.visible}
}

var fixtureIdentifier = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// The initial fixture contract deliberately accepts resource declarations only.
// No recursive includes, project overrides, or implicit declaration replacement.
func prepareExample(source, fixture, dir string) (docExample, error) {
	example := docExample{program: source, display: source}
	if fixture == "" {
		return example, nil
	}
	if filepath.IsAbs(fixture) || !filepath.IsLocal(fixture) {
		return example, fmt.Errorf("fixture path must be relative and stay within the Markdown directory")
	}
	path, err := filepath.EvalSymlinks(filepath.Join(dir, fixture))
	if err != nil {
		return example, fmt.Errorf("read fixture: %w", err)
	}
	base, err := filepath.EvalSymlinks(dir)
	if err != nil {
		return example, err
	}
	relative, err := filepath.Rel(base, path)
	if err != nil || !filepath.IsLocal(relative) {
		return example, fmt.Errorf("fixture must stay within the Markdown directory")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return example, err
	}
	var shared, snippet map[string]any
	if err := decodeExampleYAML(string(raw), &shared); err != nil {
		return example, fmt.Errorf("fixture YAML: %w", err)
	}
	if err := decodeExampleYAML(source, &snippet); err != nil {
		return example, fmt.Errorf("snippet YAML: %w", err)
	}
	for key := range shared {
		if key != "name" && key != "runtime" && key != "resources" {
			return example, fmt.Errorf("fixture field %q is not supported; use name, runtime, and resources", key)
		}
	}
	if len(snippet) != 1 || snippet["resources"] == nil {
		return example, fmt.Errorf("fixture snippets must contain only resources")
	}
	if shared["name"] == nil || shared["runtime"] != "yaml" {
		return example, fmt.Errorf("fixture must declare a project name and runtime: yaml")
	}
	resources, ok := shared["resources"].(map[string]any)
	if !ok {
		return example, fmt.Errorf("fixture must contain a resources mapping")
	}
	visible, ok := snippet["resources"].(map[string]any)
	if !ok || len(visible) == 0 {
		return example, fmt.Errorf("snippet must contain a nonempty resources mapping")
	}
	example.visible = map[string]bool{}
	for name, resource := range visible {
		if _, exists := resources[name]; exists {
			return example, fmt.Errorf("duplicate resource %q in fixture and snippet", name)
		}
		resources[name] = resource
		example.visible[name] = true
	}
	for name := range resources {
		if !fixtureIdentifier.MatchString(name) || strings.HasPrefix(name, "__awsxDocs") {
			return example, fmt.Errorf(
				"fixture resource %q must be an identifier without the reserved __awsxDocs prefix",
				name,
			)
		}
	}
	merged, err := yaml.Marshal(shared)
	if err != nil {
		return example, err
	}
	example.program = string(merged)
	return example, nil
}

func decodeExampleYAML(source string, result *map[string]any) error {
	decoder := yaml.NewDecoder(strings.NewReader(source))
	if err := decoder.Decode(result); err != nil {
		return err
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		return fmt.Errorf("expected exactly one YAML document")
	}
	return nil
}

const resourceBoundary = "AWSX_DOCS_RESOURCE:"
const endBoundary = "AWSX_DOCS_END"

// Place boundaries on parsed PCL declarations, not on language-specific syntax.
// A final local depends on all resources so its leading comment is emitted after
// their declarations. Go does not preserve resource closing-brace comments.
func markResourceBoundaries(program map[string]string, visible map[string]bool) (map[string]bool, error) {
	type insertion struct {
		offset int
		text   string
	}
	found := map[string]bool{}
	var names []string
	for filename, source := range program {
		if strings.Contains(source, "AWSX_DOCS_") || strings.Contains(source, "__awsxDocs") {
			return nil, fmt.Errorf("example uses a reserved documentation marker")
		}
		file, diagnostics := hclsyntax.ParseConfig([]byte(source), filename, hcl.InitialPos)
		if diagnostics.HasErrors() {
			return nil, fmt.Errorf("parse converted example: %s", diagnostics.Error())
		}
		body := file.Body.(*hclsyntax.Body)
		if len(body.Attributes) != 0 {
			return nil, fmt.Errorf("fixture conversion produced unsupported top-level attributes")
		}
		var insertions []insertion
		for _, block := range body.Blocks {
			if block.Type != "resource" || len(block.Labels) != 2 {
				return nil, fmt.Errorf("fixture conversion produced an unsupported %q block", block.Type)
			}
			name := block.Labels[0]
			found[name] = true
			names = append(names, name)
			insertions = append(
				insertions,
				insertion{block.TypeRange.Start.Byte, "// " + resourceBoundary + name + "\n"},
			)
		}
		sort.Slice(insertions, func(i, j int) bool { return insertions[i].offset > insertions[j].offset })
		for _, item := range insertions {
			source = source[:item.offset] + item.text + source[item.offset:]
		}
		program[filename] = source
	}
	for name := range visible {
		if !found[name] {
			return nil, fmt.Errorf("snippet resource %q missing from converted program", name)
		}
	}
	sort.Strings(names)
	for i := range names {
		names[i] += ".urn"
	}
	program["__awsxDocsEnd.pp"] = "// " + endBoundary + "\n__awsxDocsEnd = [" + strings.Join(names, ", ") + "]\n"
	for name := range found {
		found[name] = visible[name]
	}
	return found, nil
}

// Extract only explicitly marked resource regions. Fail closed if a generator
// drops markers. This intentionally omits imports and program entry-point wrappers.
func selectResources(code string, visible map[string]bool) (string, error) {
	var result strings.Builder
	found := map[string]bool{}
	active, ended := false, false
	for _, line := range strings.SplitAfter(code, "\n") {
		comment := strings.TrimSpace(line)
		if text, ok := strings.CutPrefix(comment, "// "); ok {
			comment = text
		} else if text, ok := strings.CutPrefix(comment, "# "); ok {
			comment = text
		} else {
			comment = ""
		}
		if comment == endBoundary {
			if ended {
				return "", fmt.Errorf("duplicate end boundary")
			}
			active, ended = false, true
			continue
		}
		if strings.HasPrefix(comment, resourceBoundary) {
			if ended {
				return "", fmt.Errorf("resource emitted after end boundary")
			}
			name := strings.TrimPrefix(comment, resourceBoundary)
			if _, ok := visible[name]; !ok {
				return "", fmt.Errorf("unexpected resource boundary %q", name)
			}
			if found[name] {
				return "", fmt.Errorf("duplicate resource boundary %q", name)
			}
			found[name] = true
			active = visible[name]
			continue
		}
		if active {
			result.WriteString(line)
		}
	}
	if !ended {
		return "", fmt.Errorf("generator did not preserve end boundary")
	}
	for name := range visible {
		if !found[name] {
			return "", fmt.Errorf("generator did not preserve resource boundary %q", name)
		}
	}
	return dedentSnippet(result.String()), nil
}

func dedentSnippet(code string) string {
	lines := strings.Split(strings.TrimRight(code, "\n"), "\n")
	indent := -1
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		n := len(line) - len(strings.TrimLeft(line, " \t"))
		if indent == -1 || n < indent {
			indent = n
		}
	}
	for i, line := range lines {
		if indent > 0 && len(line) >= indent {
			lines[i] = line[indent:]
		}
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}
