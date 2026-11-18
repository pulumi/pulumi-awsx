// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.

// build-docs is a focused entry point for previewing documentation against a schema file.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/pulumi/pulumi-awsx/provider/v3/pkg/docgen"
)

func main() {
	schemaPath := flag.String("schema", "", "Local schema containing the documented resources")
	docsDir := flag.String("docs", "awsx-next/docs", "Component Markdown directory, organized by schema module")
	out := flag.String("out", "", "Enriched schema output file, distinct from the input")
	flag.Parse()
	if *schemaPath == "" || *out == "" {
		flag.Usage()
		os.Exit(2)
	}
	if err := docgen.BuildFile(*schemaPath, *docsDir, *out); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
