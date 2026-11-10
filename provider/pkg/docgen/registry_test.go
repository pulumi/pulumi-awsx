// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.
package docgen

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pgavlin/goldmark"
	"github.com/pgavlin/goldmark/renderer/html"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func TestRegistryExampleRendersMarkdownInsideTabs(t *testing.T) {
	markdown := "{{% example %}}\n```python\nprint(\"<tag>&\")\n```\n```typescript\nconst value = 1;\n```\n{{% /example %}}\n"
	rendered, err := renderRegistryExample(markdown)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(rendered, `options="typescript,python"`) {
		t.Fatalf("incorrect chooser: %s", rendered)
	}
	if strings.Contains(rendered, "{{%") {
		t.Fatalf("schema shortcodes leaked into landing output: %s", rendered)
	}
	var page bytes.Buffer
	if err := goldmark.New(goldmark.WithRendererOptions(html.WithUnsafe())).Convert([]byte(rendered), &page); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`<pulumi-chooser type="language"`, `<pulumi-choosable type="language" values="python">`, `<pre><code class="language-python">`, "&lt;tag&gt;&amp;"} {
		if !strings.Contains(page.String(), want) {
			t.Errorf("rendered HTML is missing %q: %s", want, page.String())
		}
	}
}

func TestLandingPreservesProseAndGroupsAuthoredHCL(t *testing.T) {
	prefix := "---\ntitle: Example\nlayout: package\n---\n\nAuthored prose.\n\n```yaml\nordinary: unchanged\n```\n\n{{< aws-resource-note >}}\n\n"
	source := prefix + beginChooser + "\n```yaml pulumi-example\nname: example\nruntime: yaml\n```\n```hcl\nresource \"example_widget\" \"app\" {}\n```\n" + endChooser + "\nAfter.\n"
	output, err := renderLandingMarkdown(source, func(yaml string) (string, error) {
		if yaml != "name: example\nruntime: yaml\n" {
			t.Fatalf("incorrect extracted YAML %q", yaml)
		}
		return beginChooser + "\n\n```typescript\nconst app = 1;\n```\n```yaml\n" + yaml + "```\n" + endChooser + "\n", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(output, prefix) || !strings.HasSuffix(output, "\nAfter.\n") {
		t.Fatalf("changed surrounding authored Markdown: %s", output)
	}
	if !strings.Contains(output, `options="typescript,yaml,hcl"`) || !strings.Contains(output, `resource "example_widget" "app" {}`) {
		t.Fatalf("lost authored HCL variant: %s", output)
	}
	if strings.Contains(output, beginChooser) || strings.Contains(output, "yaml pulumi-example") {
		t.Fatalf("unexpanded authoring syntax: %s", output)
	}
}

func TestLandingKeepsMarkersInsideOrdinaryCode(t *testing.T) {
	source := "Examples of reserved syntax:\n\n````markdown\n" + beginChooser + "\n```yaml pulumi-example\nnot a program\n```\n" + endChooser + "\n````\n"
	output, err := renderLandingMarkdown(source, func(string) (string, error) { t.Fatal("converted quoted authoring syntax"); return "", nil })
	if err != nil {
		t.Fatal(err)
	}
	if output != source {
		t.Fatalf("modified an ordinary code block: %q", output)
	}
}

func TestLandingRenderingFailures(t *testing.T) {
	failure := errors.New("invalid resource")
	_, err := renderLandingMarkdown("```yaml pulumi-example\nname: broken\n```\n", func(string) (string, error) { return "", failure })
	if !errors.Is(err, failure) {
		t.Fatalf("conversion failure was lost: %v", err)
	}
	for _, source := range []string{beginChooser, endChooser, beginChooser + beginChooser + endChooser} {
		if _, err := renderLandingMarkdown(source, func(string) (string, error) { return "", nil }); err == nil {
			t.Errorf("accepted malformed group %q", source)
		}
	}
	for _, snippet := range []string{"no snippets", "```ruby\nputs 1\n```", "```yaml\nname: one\n```\n```yaml\nname: two\n```"} {
		if _, err := renderRegistryExample(snippet); err == nil {
			t.Errorf("accepted invalid example %q", snippet)
		}
	}
}

func TestGeneratedLandingFrontMatter(t *testing.T) {
	for _, newline := range []string{"\n", "\r\n"} {
		frontMatter := strings.Join([]string{"---", "title: Example", "layout: package", "---", ""}, newline)
		source := frontMatter + newline + "Prose.\n"
		generated, err := generatedLandingPage("_index.md", source)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.HasPrefix(generated, frontMatter) || !strings.HasSuffix(generated, "Prose.\n") || !strings.Contains(generated, "Generated from docs/source/_index.md") {
			t.Fatalf("invalid generated page %q", generated)
		}
	}
	if _, err := generatedLandingPage("_index.md", "---\ntitle: broken\n"); err == nil {
		t.Fatal("accepted broken front matter")
	}
}

func TestGenerateLandingPages(t *testing.T) {
	if os.Getenv("AWSX_DOCS_INTEGRATION") != "1" {
		t.Skip("set AWSX_DOCS_INTEGRATION=1 to run Pulumi conversion")
	}
	root := t.TempDir()
	sourceDir := filepath.Join(root, "docs", "source")
	if err := os.MkdirAll(sourceDir, 0o700); err != nil {
		t.Fatal(err)
	}
	var spec schema.PackageSpec
	raw := `{"name":"docsfixture","version":"1.0.0","language":{"go":{"importBasePath":"example.com/docsfixture/sdk/go/docsfixture"},"java":{"basePackage":"com.pulumi"}},"resources":{"docsfixture:index:Widget":{"inputProperties":{"message":{"type":"string"}},"requiredInputs":["message"],"properties":{"message":{"type":"string"}}}}}`
	if err := json.Unmarshal([]byte(raw), &spec); err != nil {
		t.Fatal(err)
	}
	overview := "---\ntitle: Fixture\nlayout: package\n---\n\n## Example\n\n```yaml pulumi-example\nname: fixture\nruntime: yaml\nresources:\n  widget:\n    type: docsfixture:index:Widget\n    properties:\n      message: hello-docs\n```\n"
	install := "---\ntitle: Installation\nlayout: package\n---\n\nInstall the package.\n"
	writeSource := func(name, content string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(sourceDir, name), []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	writeSource("_index.md", overview)
	writeSource("installation-configuration.md", install)
	if err := GenerateLandingPages(&spec, root); err != nil {
		t.Fatal(err)
	}
	output, err := os.ReadFile(filepath.Join(root, "docs", "_index.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(output), "---\ntitle: Fixture") {
		t.Fatalf("front matter is not first: %s", output)
	}
	for _, language := range append(languages, struct{ runtime, fence string }{"yaml", "yaml"}) {
		if !strings.Contains(string(output), `values="`+language.fence+`"`) {
			t.Errorf("missing %s tab", language.fence)
		}
	}
	previewDir := filepath.Join(root, "preview", "landing")
	if err := GenerateLandingPagesTo(&spec, sourceDir, previewDir); err != nil {
		t.Fatal(err)
	}
	repeated, err := os.ReadFile(filepath.Join(previewDir, "_index.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(output, repeated) {
		t.Fatal("landing-page generation is nondeterministic")
	}
	// Valid conversion of an earlier page must not overwrite output when a later
	// source fails validation.
	writeSource("_index.md", strings.ReplaceAll(overview, "hello-docs", "changed"))
	writeSource("installation-configuration.md", "---\ntitle: broken front matter\n")
	if err := GenerateLandingPages(&spec, root); err == nil {
		t.Fatal("accepted invalid later page")
	}
	unchanged, err := os.ReadFile(filepath.Join(root, "docs", "_index.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(output, unchanged) {
		t.Fatal("failed build replaced an earlier output")
	}
	original, err := os.ReadFile(filepath.Join(sourceDir, "_index.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(original), "yaml pulumi-example") {
		t.Fatal("source page was overwritten")
	}
}
