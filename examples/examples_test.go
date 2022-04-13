package examples

import (
	"fmt"
	"os"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func getEnvRegion(t *testing.T) string {
	envRegion := os.Getenv("AWS_REGION")
	if envRegion == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}
	fmt.Printf("AWS Region: %v\n", envRegion)

	return envRegion
}

func getCwd(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	return cwd
}

func getBaseOptions(t *testing.T) integration.ProgramTestOptions {
	//envRegion := getEnvRegion(t)
	baseJS := integration.ProgramTestOptions{
		//Config: map[string]string{
		//	"aws:envRegion": envRegion,
		//},
		//Dependencies: []string{
		//	"@pulumi/awsx",
		//},
		//Env: []string{
		//	"NODE_PRESERVE_SYMLINKS=1",
		//},
		Quick:                true,
		SkipRefresh:          true,
		ExpectRefreshChanges: true,
	}

	return baseJS
}
