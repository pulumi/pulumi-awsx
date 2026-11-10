// Copyright 2026, Pulumi Corporation.
// Licensed under the Apache License, Version 2.0.
package docgen

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/blang/semver"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

// localLoader preserves RawLoader, allowing the RPC server and its clients to
// avoid eagerly binding and re-encoding whole AWS dependency graphs. Published
// descriptions remain untouched. Only conversion-only copies are stripped.
type localLoader struct {
	schema.ReferenceLoader
	pkg          schema.PackageReference
	raw          []byte
	mutex        sync.Mutex
	dependencies map[string][]byte
}

var _ schema.RawLoader = (*localLoader)(nil)

func newLocalLoader(spec *schema.PackageSpec, fallback schema.ReferenceLoader) (*localLoader, error) {
	raw, err := json.Marshal(spec)
	if err != nil {
		return nil, err
	}
	raw, err = conversionSchema(raw)
	if err != nil {
		return nil, err
	}
	var partial schema.PartialPackageSpec
	if err := json.Unmarshal(raw, &partial); err != nil {
		return nil, err
	}
	pkg, err := schema.ImportPartialSpec(partial, nil, fallback)
	if err != nil {
		return nil, err
	}
	return &localLoader{ReferenceLoader: fallback, pkg: pkg, raw: raw, dependencies: map[string][]byte{}}, nil
}

func (l *localLoader) LoadPackageReferenceV2(
	ctx context.Context,
	descriptor *schema.PackageDescriptor,
) (schema.PackageReference, error) {
	if descriptor.Name != l.pkg.Name() {
		return l.ReferenceLoader.LoadPackageReferenceV2(ctx, descriptor)
	}
	if descriptor.Parameterization != nil {
		return nil, fmt.Errorf("documentation examples cannot parameterize %s", l.pkg.Name())
	}
	if descriptor.Version != nil && (l.pkg.Version() == nil || !descriptor.Version.EQ(*l.pkg.Version())) {
		return nil, fmt.Errorf(
			"example requests %s version %s, not the supplied local schema version %v",
			l.pkg.Name(),
			descriptor.Version,
			l.pkg.Version(),
		)
	}
	return l.pkg, nil
}

func (l *localLoader) LoadPackageReference(name string, version *semver.Version) (schema.PackageReference, error) {
	return l.LoadPackageReferenceV2(context.Background(), &schema.PackageDescriptor{Name: name, Version: version})
}

func (l *localLoader) LoadPackageV2(
	ctx context.Context,
	descriptor *schema.PackageDescriptor,
) (*schema.Package, error) {
	ref, err := l.LoadPackageReferenceV2(ctx, descriptor)
	if err != nil {
		return nil, err
	}
	return ref.Definition()
}

func (l *localLoader) LoadPackage(name string, version *semver.Version) (*schema.Package, error) {
	return l.LoadPackageV2(context.Background(), &schema.PackageDescriptor{Name: name, Version: version})
}

func (l *localLoader) LoadRawSchemaBytes(
	ctx context.Context,
	descriptor *schema.PackageDescriptor,
) ([]byte, bool, error) {
	if descriptor.Name == l.pkg.Name() {
		if _, err := l.LoadPackageReferenceV2(ctx, descriptor); err != nil {
			return nil, false, err
		}
		return l.raw, true, nil
	}
	rawLoader, ok := l.ReferenceLoader.(schema.RawLoader)
	if !ok {
		return nil, false, nil
	}
	key, err := json.Marshal(descriptor)
	if err != nil {
		return nil, false, err
	}
	// Serialize dependency preparation to avoid concurrent full-schema copies.
	l.mutex.Lock()
	defer l.mutex.Unlock()
	if cached, ok := l.dependencies[string(key)]; ok {
		return cached, true, nil
	}
	raw, ok, err := rawLoader.LoadRawSchemaBytes(ctx, descriptor)
	if err != nil || !ok {
		return raw, ok, err
	}
	slim, err := conversionSchema(raw)
	if err != nil {
		return nil, false, err
	}
	fmt.Fprintf(
		os.Stderr,
		"Prepared %s conversion schema: %.1f MiB -> %.1f MiB\n",
		descriptor.Name,
		float64(len(raw))/(1<<20),
		float64(len(slim))/(1<<20),
	)
	l.dependencies[string(key)] = slim
	return slim, true, nil
}

// conversionSchema removes documentation only at schema-defined locations. A
// recursive deletion of keys named "description" would incorrectly delete real
// input properties with that name. Types, defaults, secrets and language metadata
// must be preserved for correct generated examples.
func conversionSchema(raw []byte) ([]byte, error) {
	var spec schema.PackageSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		return nil, err
	}
	stripObject := func(object *schema.ObjectTypeSpec) {
		if object == nil {
			return
		}
		object.Description = ""
		for name, property := range object.Properties {
			property.Description = ""
			object.Properties[name] = property
		}
	}
	spec.Description = ""
	for name, resource := range spec.Resources {
		stripObject(&resource.ObjectTypeSpec)
		stripObject(resource.StateInputs)
		for name, property := range resource.InputProperties {
			property.Description = ""
			resource.InputProperties[name] = property
		}
		spec.Resources[name] = resource
	}
	if spec.Provider != nil {
		stripObject(&spec.Provider.ObjectTypeSpec)
		stripObject(spec.Provider.StateInputs)
		for name, property := range spec.Provider.InputProperties {
			property.Description = ""
			spec.Provider.InputProperties[name] = property
		}
	}
	for name, typ := range spec.Types {
		stripObject(&typ.ObjectTypeSpec)
		for i := range typ.Enum {
			typ.Enum[i].Description = ""
		}
		spec.Types[name] = typ
	}
	for name, function := range spec.Functions {
		function.Description = ""
		stripObject(function.Inputs)
		stripObject(function.Outputs)
		if function.ReturnType != nil {
			stripObject(function.ReturnType.ObjectTypeSpec)
		}
		spec.Functions[name] = function
	}
	for name, property := range spec.Config.Variables {
		property.Description = ""
		spec.Config.Variables[name] = property
	}
	return json.Marshal(spec)
}
