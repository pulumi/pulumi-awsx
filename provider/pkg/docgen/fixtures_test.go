// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.
package docgen

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func TestFixtureValidation(t *testing.T) {
	root := t.TempDir()
	fixture := "name: shared\nruntime: yaml\nresources:\n  cluster:\n    type: test:index:Widget\n"
	if err := os.WriteFile(filepath.Join(root, "shared.yaml"), []byte(fixture), 0600); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct{ name, source, path, want string }{
		{"duplicate", "resources:\n  cluster:\n    type: test:index:Widget\n", "shared.yaml", "duplicate resource"},
		{"override", "runtime: yaml\nresources: {}\n", "shared.yaml", "only resources"},
		{"empty", "resources: {}\n", "shared.yaml", "nonempty"},
		{"traversal", "resources: {}\n", "../shared.yaml", "relative"},
		{"missing", "resources: {}\n", "missing.yaml", "read fixture"},
		{"invalid", "resources: [\n", "shared.yaml", "snippet YAML"},
		{"multiple documents", "resources: {}\n---\nresources: {}\n", "shared.yaml", "one YAML document"},
		{"duplicate YAML key", "resources: {}\nresources: {}\n", "shared.yaml", "snippet YAML"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, err := prepareExample(tc.source, tc.path, root)
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("expected %q, got %v", tc.want, err)
			}
		})
	}
	outside := filepath.Join(t.TempDir(), "outside.yaml")
	if err := os.WriteFile(outside, []byte(fixture), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(root, "link.yaml")); err != nil {
		t.Fatal(err)
	}
	if _, err := prepareExample("resources: {}\n", "link.yaml", root); err == nil {
		t.Fatal("accepted symlink outside Markdown directory")
	}
}

func TestFixtureFence(t *testing.T) {
	_, err := renderExampleFences(
		"```yaml pulumi-example fixture=common.yaml\nresources: {}\n```\n",
		func(source, path string) (string, error) {
			if path != "common.yaml" || source != "resources: {}\n" {
				t.Fatalf("lost fixture metadata: %q %q", path, source)
			}
			return "converted", nil
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	for _, info := range []string{"fixture=", "unknown=x", "fixture=a.yaml extra"} {
		input := "```yaml pulumi-example " + info + "\nresources: {}\n```"
		_, err := renderExampleFences(input, func(string, string) (string, error) {
			t.Fatal("invalid annotation reached converter")
			return "", nil
		})
		if err == nil {
			t.Fatalf("accepted %q", info)
		}
	}
}

func TestSelectResourcesFailsClosed(t *testing.T) {
	for _, code := range []string{
		"// AWSX_DOCS_RESOURCE:service\nservice();\n",
		"// AWSX_DOCS_END\n",
		"// AWSX_DOCS_END\n// AWSX_DOCS_RESOURCE:service\n",
	} {
		if _, err := selectResources(code, map[string]bool{"service": true}); err == nil {
			t.Fatalf("accepted missing or reordered boundaries: %q", code)
		}
	}
}

func TestBuildFixtureDocs(t *testing.T) {
	if os.Getenv("AWSX_DOCS_INTEGRATION") != "1" {
		t.Skip("set AWSX_DOCS_INTEGRATION=1 to run Pulumi conversion")
	}
	root := t.TempDir()
	write := func(name, content string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(root, name), []byte(content), 0600); err != nil {
			t.Fatal(err)
		}
	}
	write(
		"schema.json",
		`{
  "name": "docsfixture",
  "version": "1.0.0",
  "language": {
    "go": {
      "importBasePath": "example.com/docsfixture/sdk/go/docsfixture"
    },
    "java": {
      "basePackage": "com.pulumi"
    }
  },
  "resources": {
    "docsfixture:index:Widget": {
      "inputProperties": {
        "message": {
          "type": "string"
        },
        "details": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/types/docsfixture:index:Detail"
          }
        }
      },
      "requiredInputs": [
        "message"
      ],
      "properties": {
        "message": {
          "type": "string"
        }
      }
    }
  },
  "types": {
    "docsfixture:index:Detail": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string"
        }
      }
    }
  }
}`,
	)
	if err := os.Mkdir(filepath.Join(root, "index"), 0700); err != nil {
		t.Fatal(err)
	}
	write(
		"index/shared.yaml",
		"name: fixture\nruntime: yaml\nresources:\n  supportingWidget:\n"+
			"    type: docsfixture:index:Widget\n    properties:\n"+
			"      message: HIDDEN_FIXTURE_VALUE\n",
	)
	writeDoc := func(message string) {
		write(
			"index/Widget.md",
			"Before\n\n```yaml pulumi-example fixture=shared.yaml\nresources:\n"+
				"  shownWidget:\n    type: docsfixture:index:Widget\n    properties:\n"+
				"      message: "+message+"\n      details:\n        app:\n"+
				"          message: ${supportingWidget.message}\n```\nAfter\n",
		)
	}
	writeDoc("${supportingWidget.message}")
	out := filepath.Join(root, "out.json")
	if err := BuildFile(filepath.Join(root, "schema.json"), root, out); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	var spec schema.PackageSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		t.Fatal(err)
	}
	description := spec.Resources["docsfixture:index:Widget"].Description
	if strings.Contains(description, "%!v(PANIC=") {
		t.Fatalf("generator emitted malformed typed-map code: %s", description)
	}
	if strings.Contains(description, "HIDDEN_FIXTURE_VALUE") || strings.Contains(description, "AWSX_DOCS_") ||
		strings.Contains(description, "__awsxDocs") {
		t.Fatalf("fixture or markers leaked: %s", description)
	}
	for _, language := range append(languages, struct{ runtime, fence string }{"yaml", "yaml"}) {
		if !strings.Contains(description, "```"+language.fence+"\n") {
			t.Errorf("missing %s", language.fence)
		}
	}
	if !strings.Contains(description, "${supportingWidget.message}") ||
		!strings.Contains(description, "supportingWidget.Message") {
		t.Fatalf("lost typed fixture reference: %s", description)
	}
	// A fixture must actually participate in binding, not just suppress errors.
	writeDoc("${supportingWidget.nonexistent}")
	if err := BuildFile(filepath.Join(root, "schema.json"), root, filepath.Join(root, "bad.json")); err == nil {
		t.Fatal("accepted unknown fixture output")
	}
	if _, err := os.Stat(filepath.Join(root, "bad.json")); !os.IsNotExist(err) {
		t.Fatal("failed fixture build wrote schema")
	}
}
