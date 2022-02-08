package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
)

const providerModule = "@pulumi/awsx/cmd/provider"

func main() {
	binaryPath, err := os.Executable()
	if err != nil {
		exitError(errors.Wrapf(err, "could not find executable path"))
	}
	binaryDir := filepath.Dir(binaryPath)

	nodePath, err := exec.LookPath("node")
	if err != nil {
		exitError(errors.Wrapf(err, "could not find node on the $PATH"))
	}

	runPath, err := locateModule(providerModule, binaryDir, nodePath)
	if err != nil {
		exitError(errors.Wrapf(err,
			"It looks like the Pulumi SDK has not been installed. Have you run npm install or yarn install?"))
	}

	var args []string
	args = append(args, runPath)
	args = append(args, os.Args[1:]...)

	cmd := exec.Command(nodePath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		exitError(err)
	}
}

// locateModule resolves a node module name to a file path that can be loaded
func locateModule(mod, cwd, nodePath string) (string, error) {
	program := fmt.Sprintf("console.log(require.resolve('%s'));", mod)
	cmd := exec.Command(nodePath, "-e", program)
	cmd.Dir = cwd
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func exitError(err error) {
	fmt.Fprintf(os.Stderr, "error: %v", err)
	os.Exit(1)
}
