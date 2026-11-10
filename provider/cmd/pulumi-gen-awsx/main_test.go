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

func TestEnrichComponentDocs(t *testing.T) {
	root := t.TempDir()
	directory := filepath.Join(root, "awsx-next", "docs", "experimental", "ecs")
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
	if err := enrichComponentDocs(&spec, root); err == nil || !strings.Contains(err.Error(), "awsx:experimental/ecs:Typo") {
		t.Fatalf("expected missing component error, got %v", err)
	}
	spec.Resources["awsx:experimental/ecs:Service"] = schema.ResourceSpec{}
	// A misspelled file must still fail when the experimental namespace exists.
	if err := enrichComponentDocs(&spec, root); err == nil || !strings.Contains(err.Error(), "awsx:experimental/ecs:Typo") {
		t.Fatalf("expected strict docs validation during generation, got %v", err)
	}
}
