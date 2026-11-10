// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.
package docgen

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/blang/semver"
	"github.com/pulumi/pulumi-terraform-bridge/v3/pkg/tfgen/schemafilter"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func TestLocalLoaderRejectsPublishedVersion(t *testing.T) {
	localVersion := semver.MustParse("1.0.0")
	publishedVersion := semver.MustParse("2.0.0")
	loader := &localLoader{pkg: (&schema.Package{Name: "awsx", Version: &localVersion}).Reference()}
	// No fallback loader is provided. A regression that tries the registry panics.
	_, err := loader.LoadPackageReferenceV2(context.Background(), &schema.PackageDescriptor{Name: "awsx", Version: &publishedVersion})
	if err == nil || !strings.Contains(err.Error(), "supplied local schema") {
		t.Fatalf("expected version mismatch, got %v", err)
	}
}

func TestRenderExamples(t *testing.T) {
	yaml := "name: example\nruntime: yaml\n"
	ordinary := "```yaml\nfragment: unchanged\n```\n"
	// The annotated-looking block inside a longer Markdown fence is documentation,
	// not an example to execute. A shorter fence inside YAML is also just content.
	quoted := "````markdown\n```yaml pulumi-example\nnot a program\n```\n````\n"
	input := "Before\n\n" + ordinary + quoted + "\n```yaml pulumi-example\n" + yaml + "```\nBetween\n\n~~~~yaml pulumi-example\n" + yaml + "~~~~\nAfter\n"
	calls := 0
	actual, err := renderExamples(input, func(source string) (string, error) {
		calls++
		if source != yaml {
			t.Fatalf("unexpected extracted program %q", source)
		}
		return "GENERATED\n", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	expected := "Before\n\n" + ordinary + quoted + "\nGENERATED\nBetween\n\nGENERATED\nAfter\n"
	if actual != expected || calls != 2 {
		t.Fatalf("got %d calls and output %q", calls, actual)
	}
	failure := errors.New("invalid YAML resource")
	_, err = renderExamples("```yaml pulumi-example\n"+yaml+"```", func(string) (string, error) { return "", failure })
	if !errors.Is(err, failure) {
		t.Fatalf("expected conversion failure, got %v", err)
	}
	for _, input := range []string{"```yaml pulumi-example\n```", "```yaml pulumi-example\nname: missing-close\n", "> ```yaml pulumi-example\n> name: nested\n> ```"} {
		if _, err := renderExamples(input, func(string) (string, error) { t.Fatal("invalid fence reached converter"); return "", nil }); err == nil {
			t.Fatalf("accepted invalid fence %q", input)
		}
	}
}

func TestDiscover(t *testing.T) {
	root := t.TempDir()
	for _, name := range []string{"README.md", "experimental/ecs/TaskDefinition.md", "experimental/other/TaskDefinition.md", "experimental/ecs/ignored.txt"} {
		path := filepath.Join(root, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("prose"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	resources, err := Discover("awsx", root)
	if err != nil {
		t.Fatal(err)
	}
	if len(resources) != 2 {
		t.Fatalf("unexpected discovered docs: %v", resources)
	}
	for _, module := range []string{"experimental/ecs", "experimental/other"} {
		if _, ok := resources["awsx:"+module+":TaskDefinition"]; !ok {
			t.Fatalf("lost module-qualified component in %v", resources)
		}
	}
	spec := schema.PackageSpec{Name: "awsx", Resources: map[string]schema.ResourceSpec{}}
	if err := Enrich(&spec, root); err == nil || !strings.Contains(err.Error(), "absent from the local schema") {
		t.Fatalf("expected unmatched file error, got %v", err)
	}
}

// This exercises the real YAML converter and every language generator against
// an unpublished schema. It requires Pulumi and the YAML converter on the machine.
func TestBuildDocs(t *testing.T) {
	if os.Getenv("AWSX_DOCS_INTEGRATION") != "1" {
		t.Skip("set AWSX_DOCS_INTEGRATION=1 to run Pulumi conversion")
	}
	root := t.TempDir()
	write := func(name, value string) {
		t.Helper()
		path := filepath.Join(root, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(value), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	write("schema.json", `{"name":"docsfixture","version":"1.0.0","language":{"go":{"importBasePath":"example.com/docsfixture/sdk/go/docsfixture"},"java":{"basePackage":"com.pulumi"}},"resources":{"docsfixture:index:Widget":{"inputProperties":{"message":{"type":"string"}},"requiredInputs":["message"],"properties":{"message":{"type":"string"}}}}}`)
	const before = "# Widget\n\nIntroductory prose.\n\n### Environment variables\n\n#### Pulumi secrets\n\nExplanation before the first example.\n\n"
	const between = "\nExplanation after the first example.\n\n#### Existing secrets\n\n- Authored list item.\n\n"
	const after = "\nFinal explanation after the second example.\n"
	writeExample := func(yaml string) {
		t.Helper()
		block := "```yaml pulumi-example\n" + yaml + "```\n"
		write("index/Widget.md", before+block+between+block+after)
	}
	writeExample("name: fixture\nruntime: yaml\nresources:\n  widget:\n    type: docsfixture:index:Widget\n    properties:\n      message: hello-docs\noutputs:\n  message: ${widget.message}\n")
	out := filepath.Join(root, "enriched.json")
	if err := BuildFile(filepath.Join(root, "schema.json"), root, out); err != nil {
		t.Fatal(err)
	}
	result, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	for _, language := range append(languages, struct{ runtime, fence string }{"yaml", "yaml"}) {
		if !strings.Contains(string(result), "```"+language.fence) {
			t.Errorf("missing %s example", language.fence)
		}
	}
	if strings.Contains(string(result), "yaml pulumi-example") {
		t.Fatal("unexpanded example fence")
	}
	var documented schema.PackageSpec
	if err := json.Unmarshal(result, &documented); err != nil {
		t.Fatal(err)
	}
	description := documented.Resources["docsfixture:index:Widget"].Description
	if strings.Count(description, beginChooser) != 2 || strings.Count(description, endChooser) != 2 {
		t.Fatalf("expected one inline chooser per example: %s", description)
	}
	if strings.Contains(description, "{{%") {
		t.Fatalf("schema example wrappers still present: %s", description)
	}
	if !strings.HasPrefix(description, before) || !strings.Contains(description, between) || !strings.HasSuffix(description, after) {
		t.Fatalf("authored headings or prose were changed: %s", description)
	}
	// Exercise the local copy of the registry's inline rendering convention on
	// the actual enriched description, including nested headings and prose.
	rendered, err := renderLandingMarkdown(description, func(string) (string, error) {
		t.Fatal("an authored YAML annotation survived conversion")
		return "", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(rendered, "<pulumi-chooser ") != 2 || !strings.HasPrefix(rendered, before) || !strings.Contains(rendered, between) || !strings.HasSuffix(rendered, after) {
		t.Fatalf("inline rendering lost examples or authored structure: %s", rendered)
	}
	for _, language := range languages {
		var filtered schema.PackageSpec
		if err := json.Unmarshal(schemafilter.FilterSchemaByLanguage(result, language.runtime), &filtered); err != nil {
			t.Fatal(err)
		}
		description := filtered.Resources["docsfixture:index:Widget"].Description
		if strings.Contains(description, "PulumiCodeChooser") || strings.Count(description, "```"+language.fence) != 2 {
			t.Errorf("%s SDK docs retained markers or lost examples: %s", language.runtime, description)
		}
		if !strings.HasPrefix(description, before) || !strings.Contains(description, between) || !strings.HasSuffix(description, after) {
			t.Errorf("%s SDK docs lost authored structure: %s", language.runtime, description)
		}
		for _, other := range append(languages, struct{ runtime, fence string }{"yaml", "yaml"}) {
			if other.fence != language.fence && strings.Contains(description, "```"+other.fence) {
				t.Errorf("%s SDK docs retained %s snippet", language.runtime, other.fence)
			}
		}
	}
	// A misspelled input must fail rather than publishing misleading snippets.
	writeExample("name: fixture\nruntime: yaml\nresources:\n  widget:\n    type: docsfixture:index:Widget\n    properties:\n      message: hello-docs\n      nonexistent: invalid\n")
	if err := BuildFile(filepath.Join(root, "schema.json"), root, filepath.Join(root, "bad.json")); err == nil {
		t.Fatal("accepted unknown resource input")
	}
	if _, err := os.Stat(filepath.Join(root, "bad.json")); !os.IsNotExist(err) {
		t.Fatal("failed build wrote an output schema")
	}
}
