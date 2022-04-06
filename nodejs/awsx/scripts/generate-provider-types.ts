import * as pulumiSchema from "./pulumi-schema";
import * as fs from "fs";
import * as ts from "typescript";
import path = require("path");

/*
 TODO:
 - Type docs
 - Property docs
 */

const headerWarning = `This file was automatically generated by pulumi-provider-scripts.
DO NOT MODIFY IT BY HAND. Instead, modify the source Pulumi Schema file,
and run "pulumi-provider-scripts gen-provider-types" to regenerate this file.`;
interface ExternalRef {
    import: string;
    name: string;
}
const externalRefs: Record<string, ExternalRef> = {
    "/aws/v4.37.1/schema.json": {
        import: "@pulumi/aws",
        name: "aws",
    },
};

type Direction = "Input" | "Output";

const resolveRef = (ref: unknown, direction: Direction): ts.TypeNode => {
    if (typeof ref !== "string") {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    }
    if (ref === "pulumi.json#/Any") {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    }
    const typesPrefix = "#/types/";
    const resourcesPrefix = "#/resources/";
    if (ref.startsWith(typesPrefix)) {
        const typeName = ref.substring(typesPrefix.length).split(":");
        return ts.factory.createTypeReferenceNode(
            typeName[2] + direction + "s",
        );
    }
    const externalName = ref.split("#")[0];
    const externalRef = externalRefs[externalName];
    if (externalRef !== undefined) {
        const relativeRef = ref.substring(externalName.length);
        if (relativeRef.startsWith(typesPrefix)) {
            const typeName = relativeRef.substring(typesPrefix.length);
            const typeParts = typeName.split(":");
            const resourceName = typeParts[2];
            const path = decodeURIComponent(typeParts[1]).split("/");
            return ts.factory.createTypeReferenceNode(
                [
                    externalRef.name,
                    "types",
                    direction.toLowerCase(),
                    ...path.slice(0, -1),
                    resourceName,
                ].join("."),
            );
        }
        if (relativeRef.startsWith(resourcesPrefix)) {
            const typeName = relativeRef.substring(resourcesPrefix.length);
            const typeParts = typeName.split(":");
            const resourceName = typeParts[2];
            const path = decodeURIComponent(typeParts[1]).split("/");
            path.pop(); // Last section is same as the resource name
            return ts.factory.createTypeReferenceNode(
                [externalRef.name, ...path, resourceName].join("."),
            );
        }
    }

    console.warn("Unresolvable ref:", ref);
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
};

const getPlainType = (
    typeDefinition: pulumiSchema.TypeReference,
    direction: Direction,
): ts.TypeNode => {
    switch (typeDefinition.type) {
        case "string":
            return ts.factory.createKeywordTypeNode(
                ts.SyntaxKind.StringKeyword,
            );
        case "integer":
        case "number":
            return ts.factory.createKeywordTypeNode(
                ts.SyntaxKind.NumberKeyword,
            );
        case "boolean":
            return ts.factory.createKeywordTypeNode(
                ts.SyntaxKind.BooleanKeyword,
            );
        case "array":
            return ts.factory.createArrayTypeNode(
                getType(
                    typeDefinition.items as any,
                    direction,
                    direction === "Output",
                ),
            );
        case "object":
            return ts.factory.createTypeReferenceNode("Record", [
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                getType(
                    typeDefinition.additionalProperties as any,
                    direction,
                    direction === "Output",
                ),
            ]);
    }
    return resolveRef(typeDefinition.$ref, direction);
};

const getType = (
    typeDefinition: pulumiSchema.TypeReference,
    direction: Direction,
    plain?: boolean,
): ts.TypeNode => {
    const plainType = getPlainType(typeDefinition, direction);
    if (plain || typeDefinition.plain) {
        return plainType;
    }
    return ts.factory.createTypeReferenceNode("pulumi." + direction, [
        plainType,
    ]);
};

function genTypeProperties(
    properties: Record<string, pulumiSchema.TypeReference>,
    required: string[],
    direction: Direction,
): ts.TypeElement[] {
    if (properties === undefined) {
        return [];
    }
    const requiredLookup = new Set(required);
    return Object.entries(properties).map(
        ([propKey, typeDefinition]): ts.TypeElement => {
            const type = getType(typeDefinition, direction);

            return ts.factory.createPropertySignature(
                [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                propKey,
                requiredLookup.has(propKey)
                    ? undefined
                    : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                type,
            );
        },
    );
}

function genClassProperties(
    properties?: Record<string, pulumiSchema.TypeReference>,
    required?: string[],
) {
    if (properties === undefined) {
        return [];
    }
    const requiredLookup = new Set(required);
    return Object.entries(properties).map(([propKey, typeDefinition]) => {
        const type = getType(typeDefinition, "Output");
        return ts.factory.createPropertyDeclaration(
            undefined,
            [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
            propKey,
            requiredLookup.has(propKey)
                ? ts.factory.createToken(ts.SyntaxKind.ExclamationToken)
                : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
            type,
            undefined,
        );
    });
}

const genResourceArgs = (
    typeName: string,
    resource: pulumiSchema.ObjectTypeDefinition,
): ts.InterfaceDeclaration => {
    const inputProperties = genTypeProperties(
        resource.inputProperties as any,
        resource.requiredInputs as any,
        "Input",
    );
    const inputs = ts.factory.createInterfaceDeclaration(
        undefined,
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        typeName + "Args",
        undefined,
        undefined,
        inputProperties,
    );

    return inputs;
};

const genResourceAbstractType = (
    typeToken: string,
    typeName: string,
    resource: pulumiSchema.ObjectTypeDefinition,
) => {
    const heritage = ts.factory.createHeritageClause(
        ts.SyntaxKind.ExtendsKeyword,
        [
            ts.factory.createExpressionWithTypeArguments(
                ts.factory.createPropertyAccessChain(
                    ts.factory.createIdentifier("pulumi"),
                    undefined,
                    "ComponentResource",
                ),
                undefined,
            ),
        ],
    );
    const constructor = ts.factory.createConstructorDeclaration(
        undefined,
        undefined,
        [
            ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                "name",
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ),
            ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                "args",
                undefined,
                ts.factory.createTypeReferenceNode("pulumi.Inputs"),
            ),
            ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                "opts",
                undefined,
                ts.factory.createTypeReferenceNode(
                    "pulumi.ComponentResourceOptions",
                ),
                ts.factory.createObjectLiteralExpression(undefined),
            ),
        ],
        ts.factory.createBlock([
            ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                    ts.factory.createSuper(),
                    undefined,
                    [
                        ts.factory.createStringLiteral(typeToken),
                        ts.factory.createIdentifier("name"),
                        ts.factory.createObjectLiteralExpression([]),
                        ts.factory.createIdentifier("opts"),
                    ],
                ),
            ),
        ]),
    );
    const resourceType = ts.factory.createClassDeclaration(
        undefined,
        [
            ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
            ts.factory.createModifier(ts.SyntaxKind.AbstractKeyword),
        ],
        typeName,
        undefined,
        [heritage],
        [
            ...genClassProperties(
                resource.properties as any,
                resource.required as any,
            ),
            constructor,
        ],
    );

    return resourceType;
};

const genTypeInterfaces = (
    typeName: string,
    resource: pulumiSchema.TypeDefinition,
): ts.InterfaceDeclaration[] => {
    const inputProperties = genTypeProperties(
        resource.properties as any,
        resource.required as any,
        "Input",
    );
    const inputs = ts.factory.createInterfaceDeclaration(
        undefined,
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        typeName + "Inputs",
        undefined,
        undefined,
        inputProperties,
    );

    const outputProperties = genTypeProperties(
        resource.properties as any,
        resource.required as any,
        "Output",
    );
    const outputs = ts.factory.createInterfaceDeclaration(
        undefined,
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        typeName + "Outputs",
        undefined,
        undefined,
        outputProperties,
    );

    return [inputs, outputs];
};

function getTypeName(typeToken: string) {
    const tokenParts = typeToken.split(":");
    const typeName = tokenParts[2];
    return typeName;
}

function genResources(
    resources: pulumiSchema.PulumiPackageMetaschema["resources"],
) {
    return Object.entries(resources ?? {}).flatMap(([typeToken, resource]) => {
        const typeName = getTypeName(typeToken);
        return [
            genResourceAbstractType(typeToken, typeName, resource),
            genResourceArgs(typeName, resource),
        ];
    });
}

function genTypes(resources: pulumiSchema.PulumiPackageMetaschema["types"]) {
    return Object.entries(resources ?? {}).flatMap(([key, value]) =>
        genTypeInterfaces(getTypeName(key), value),
    );
}

export function generateProviderTypes(args: { schama: string; out: string }) {
    const schemaPath = path.resolve(args.schama);
    const schemaText = fs.readFileSync(schemaPath, { encoding: "utf-8" });
    const schema: pulumiSchema.PulumiPackageMetaschema = JSON.parse(schemaText);

    const nodes = ts.factory.createNodeArray([
        ts.factory.createJSDocComment(headerWarning),
        ts.factory.createImportDeclaration(
            undefined,
            undefined,
            ts.factory.createImportClause(
                false,
                ts.factory.createIdentifier("* as pulumi"),
                undefined,
            ),
            ts.factory.createStringLiteral("@pulumi/pulumi"),
        ),
        ...Object.values(externalRefs).map((externalRef) =>
            ts.factory.createImportDeclaration(
                undefined,
                undefined,
                ts.factory.createImportClause(
                    false,
                    ts.factory.createIdentifier("* as " + externalRef.name),
                    undefined,
                ),
                ts.factory.createStringLiteral(externalRef.import),
            ),
        ),
        ...genResources(schema.resources),
        ...genTypes(schema.types),
    ]);
    const sourceFile = ts.createSourceFile(
        "provider-types.d.ts",
        "",
        ts.ScriptTarget.ES2019,
        undefined,
        ts.ScriptKind.TS,
    );

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const result = printer.printList(
        ts.ListFormat.MultiLine,
        nodes,
        sourceFile,
    );

    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, result);
}

generateProviderTypes({
    schama: "../../provider/cmd/pulumi-resource-awsx/schema.json",
    out: "schema-types.ts",
});
