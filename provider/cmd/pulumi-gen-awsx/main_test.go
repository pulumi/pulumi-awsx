// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.
package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func TestSDKGenerationReusesGeneratedSchema(t *testing.T) {
	root := t.TempDir()
	for _, directory := range []string{
		"provider/cmd/pulumi-resource-awsx", "awsx-next/docs/ecs", "awsx-classic",
	} {
		if err := os.MkdirAll(filepath.Join(root, directory), 0o700); err != nil {
			t.Fatal(err)
		}
	}
	// There is no component implementation to infer. Authored docs are deliberately invalid:
	// SDK generation must use the already converted description in schema.json instead.
	if err := os.WriteFile(filepath.Join(root, "awsx-next/docs/ecs/Typo.md"),
		[]byte("must not be converted again"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "provider/cmd/pulumi-resource-awsx/schema.json"), []byte(`{
		"name": "fixture",
		"resources": {
			"fixture:index:Thing": {
				"isComponent": true,
				"description": "Description from the generated schema.",
				"inputProperties": {"message": {"type": "string"}},
				"requiredInputs": ["message"]
			}
		}
	}`), 0o600); err != nil {
		t.Fatal(err)
	}
	out := filepath.Join(root, "sdk", "nodejs")
	if err := generate(Nodejs, root, out, ""); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(out, "thing.ts"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "Description from the generated schema.") ||
		!strings.Contains(string(raw), "message: pulumi.Input<string>") {
		t.Fatalf("SDK did not preserve the generated schema contract:\n%s", raw)
	}
}

func TestEnrichComponentDocs(t *testing.T) {
	root := t.TempDir()
	directory := filepath.Join(root, "awsx-next", "docs", "ecs")
	if err := os.MkdirAll(directory, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(directory, "Typo.md"), []byte("component docs"), 0o600); err != nil {
		t.Fatal(err)
	}
	spec := schema.PackageSpec{Name: "awsx", Resources: map[string]schema.ResourceSpec{
		"awsx:ecs:FargateService": {},
	}}
	// Missing integration must fail rather than silently skip authored docs.
	if err := enrichComponentDocs(&spec, root); err == nil ||
		!strings.Contains(err.Error(), "awsx:ecs:Typo") {
		t.Fatalf("expected missing component error, got %v", err)
	}
	spec.Resources["awsx:ecs:Service"] = schema.ResourceSpec{}
	// A misspelled file must still fail when the ECS module exists.
	if err := enrichComponentDocs(&spec, root); err == nil ||
		!strings.Contains(err.Error(), "awsx:ecs:Typo") {
		t.Fatalf("expected strict docs validation during generation, got %v", err)
	}
}
