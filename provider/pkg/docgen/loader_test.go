// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.
package docgen

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	codegenrpc "github.com/pulumi/pulumi/sdk/v3/proto/go/codegen"
)

func TestConversionSchemaPreservesAPIAndSource(t *testing.T) {
	raw := []byte(
		`{
  "name": "fixture",
  "description": "package prose",
  "language": {
    "go": {"importBasePath":"example.com/fixture"}
  },
  "resources": {
    "fixture:index:Thing": {
      "description": "resource prose",
      "inputProperties": {
        "description": {
          "type": "string",
          "description": "input prose",
          "secret": true,
          "default": "default text"
        }
      },
      "requiredInputs": [
        "description"
      ],
      "properties": {
        "description": {
          "type": "string",
          "description": "output prose"
        }
      }
    }
  },
  "types": {
    "fixture:index:Settings": {
      "type": "object",
      "description": "type prose",
      "properties": {
        "description": {
          "type": "string",
          "description": "nested prose"
        }
      },
      "required": [
        "description"
      ]
    }
  }
}`,
	)
	slim, err := conversionSchema(raw)
	if err != nil {
		t.Fatal(err)
	}
	var original, converted schema.PackageSpec
	if err := json.Unmarshal(raw, &original); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(slim, &converted); err != nil {
		t.Fatal(err)
	}
	if original.Resources["fixture:index:Thing"].Description != "resource prose" {
		t.Fatal("mutated the source schema")
	}
	resource := converted.Resources["fixture:index:Thing"]
	if converted.Description != "" || resource.Description != "" ||
		resource.InputProperties["description"].Description != "" {
		t.Fatal("retained conversion-only documentation")
	}
	property, ok := resource.InputProperties["description"]
	if !ok || !property.Secret || property.Default != "default text" || property.Type != "string" {
		t.Fatalf("changed a real description input: %#v", property)
	}
	if len(resource.RequiredInputs) != 1 || resource.RequiredInputs[0] != "description" {
		t.Fatal("lost required inputs")
	}
	if converted.Types["fixture:index:Settings"].Properties["description"].Type != "string" {
		t.Fatal("lost nested description property")
	}
	if string(converted.Language["go"]) != string(original.Language["go"]) {
		t.Fatal("changed language metadata")
	}
}

type rawOnlyLoader struct {
	schema.ReferenceLoader // Binding is intentionally unavailable and would panic.
	raw                    []byte
	calls                  int
}

func (l *rawOnlyLoader) LoadRawSchemaBytes(context.Context, *schema.PackageDescriptor) ([]byte, bool, error) {
	l.calls++
	return l.raw, true, nil
}

func TestLocalLoaderServesAndCachesRawSchemasWithoutBinding(t *testing.T) {
	fallback := &rawOnlyLoader{
		raw: []byte(
			`{
  "name": "dep",
  "version": "1.0.0",
  "description": "dependency docs",
  "resources": {
    "dep:index:Role": {
      "properties": {
        "description": {
          "type": "string"
        }
      }
    }
  }
}`,
		),
	}
	spec := schema.PackageSpec{Name: "awsx", Resources: map[string]schema.ResourceSpec{
		"awsx:experimental/ecs:Thing": {
			ObjectTypeSpec: schema.ObjectTypeSpec{Properties: map[string]schema.PropertySpec{
				"role": {TypeSpec: schema.TypeSpec{Ref: "/dep/v1.0.0/schema.json#/resources/dep:index:Role"}},
			}},
		},
	}}
	loader, err := newLocalLoader(&spec, fallback)
	if err != nil {
		t.Fatal(err)
	}
	if fallback.calls != 0 {
		t.Fatal("eagerly loaded a dependency")
	}
	server := schema.NewLoaderServer(loader)
	for _, name := range []string{"awsx", "dep", "dep"} {
		response, err := server.GetSchema(context.Background(), &codegenrpc.GetSchemaRequest{Package: name})
		if err != nil {
			t.Fatal(err)
		}
		var served schema.PackageSpec
		if err := json.Unmarshal(response.Schema, &served); err != nil {
			t.Fatal(err)
		}
		if served.Name != name || served.Description != "" {
			t.Fatalf("incorrect raw schema for %s", name)
		}
	}
	if fallback.calls != 1 {
		t.Fatalf("dependency prepared %d times", fallback.calls)
	}
}
