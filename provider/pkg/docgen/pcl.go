// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.

package docgen

import (
	"fmt"
	"sort"
	"strings"

	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclsyntax"
	"github.com/zclconf/go-cty/cty"
)

// YAML conversion quotes object keys. For static identifier keys, use the
// equivalent bare-key PCL syntax. Java's typed-object generator requires literal
// keys rather than single-part template expressions. Dynamic keys stay intact.
func normalizeObjectKeys(program map[string]string) error {
	for filename, source := range program {
		file, diagnostics := hclsyntax.ParseConfig([]byte(source), filename, hcl.InitialPos)
		if diagnostics.HasErrors() {
			return fmt.Errorf("parse converted PCL: %s", diagnostics.Error())
		}
		type replacement struct {
			start, end int
			text       string
		}
		var replacements []replacement
		hclsyntax.VisitAll(file.Body.(*hclsyntax.Body), func(node hclsyntax.Node) hcl.Diagnostics {
			key, ok := node.(*hclsyntax.ObjectConsKeyExpr)
			if !ok {
				return nil
			}
			template, ok := key.Wrapped.(*hclsyntax.TemplateExpr)
			if !ok || len(template.Parts) != 1 {
				return nil
			}
			literal, ok := template.Parts[0].(*hclsyntax.LiteralValueExpr)
			if !ok || literal.Val.Type() != cty.String || !literal.Val.IsKnown() || literal.Val.IsNull() {
				return nil
			}
			value := literal.Val.AsString()
			// HCL treats bare true, false, and null as literal values, not string keys.
			if !hclsyntax.ValidIdentifier(value) || value == "true" || value == "false" || value == "null" {
				return nil
			}
			r := key.Range()
			if !strings.HasPrefix(source[r.Start.Byte:r.End.Byte], "\"") {
				return nil
			}
			replacements = append(replacements, replacement{r.Start.Byte, r.End.Byte, value})
			return nil
		})
		sort.Slice(replacements, func(i, j int) bool { return replacements[i].start > replacements[j].start })
		for _, r := range replacements {
			source = source[:r.start] + r.text + source[r.end:]
		}
		program[filename] = source
	}
	return nil
}
