package examples

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ecs"
	"github.com/aws/aws-sdk-go-v2/service/ecs/types"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optpreview"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAccEcsServiceManagedInstances(t *testing.T) {
	testEcsServiceCapacity(t, "managedInstances")
}

func TestAccEcsServiceEC2(t *testing.T) {
	testEcsServiceCapacity(t, "ec2")
}

func testEcsServiceCapacity(t *testing.T, capacityType string) {
	t.Helper()
	getEnvRegion(t)
	pt := newExperimentalPackageTest(t, "service-capacity-nodejs")
	pt.SetConfig(t, "capacityType", capacityType)
	pt.SetConfig(t, "taskDefinitionFamily", fmt.Sprintf("awsx-capacity-%s-%d", capacityType, time.Now().UnixNano()))
	if capacityType == "managedInstances" {
		pt.SetConfig(t, "deployServices", "false")
	}
	result := pt.Up(t)
	client := ecs.NewFromConfig(loadAwsDefaultConfig(t))
	if capacityType == "managedInstances" {
		provider := result.Outputs["providerName"].Value.(string)
		// Provider creation can finish before ECS accepts the provider in a strategy.
		// Wait on observed readiness instead of adding a fixed sleep to the program.
		ctx, cancel := context.WithTimeout(t.Context(), 5*time.Minute)
		defer cancel()
		require.EventuallyWithT(t, func(c *assert.CollectT) {
			described, err := client.DescribeCapacityProviders(ctx, &ecs.DescribeCapacityProvidersInput{
				CapacityProviders: []string{provider},
			})
			if !assert.NoError(c, err) || !assert.Empty(c, described.Failures) || !assert.Len(c, described.CapacityProviders, 1) {
				return
			}
			assert.Equal(c, types.CapacityProviderStatusActive, described.CapacityProviders[0].Status)
			assert.Equal(c, types.CapacityProviderUpdateStatusCreateComplete, described.CapacityProviders[0].UpdateStatus)
		}, 5*time.Minute, 5*time.Second)
		pt.SetConfig(t, "deployServices", "true")
		result = pt.Up(t)
	}

	cluster := result.Outputs["clusterArn"].Value.(string)
	provider := result.Outputs["providerName"].Value.(string)
	taskDefinition := result.Outputs["taskDefinitionArn"].Value.(string)
	serviceNames := result.Outputs["serviceNames"].Value.([]any)
	serviceArns := result.Outputs["serviceArns"].Value.([]any)
	require.Len(t, serviceNames, 2)
	require.Len(t, serviceArns, 2)
	ctx, cancel := context.WithTimeout(t.Context(), 3*time.Minute)
	defer cancel()
	for i, mode := range []string{"explicit", "inherited"} {
		t.Run(mode, func(t *testing.T) {
			name := serviceNames[i].(string)
			described, err := client.DescribeServices(ctx, &ecs.DescribeServicesInput{
				Cluster: aws.String(cluster), Services: []string{name},
			})
			require.NoError(t, err)
			require.Empty(t, described.Failures)
			require.Len(t, described.Services, 1)
			service := described.Services[0]
			require.Equal(t, serviceArns[i], aws.ToString(service.ServiceArn))
			require.Equal(t, int32(1), service.DesiredCount)
			require.Equal(t, int32(1), service.RunningCount)
			require.Zero(t, service.PendingCount)
			require.Len(t, service.CapacityProviderStrategy, 1)
			require.Equal(t, provider, aws.ToString(service.CapacityProviderStrategy[0].CapacityProvider))

			// Observe actual task placement, not just the strategy in Pulumi state.
			require.EventuallyWithT(t, func(c *assert.CollectT) {
				listed, err := client.ListTasks(ctx, &ecs.ListTasksInput{
					Cluster: aws.String(cluster), ServiceName: aws.String(name), DesiredStatus: types.DesiredStatusRunning,
				})
				if !assert.NoError(c, err) || !assert.Len(c, listed.TaskArns, 1) {
					return
				}
				tasks, err := client.DescribeTasks(ctx, &ecs.DescribeTasksInput{Cluster: aws.String(cluster), Tasks: listed.TaskArns})
				if !assert.NoError(c, err) || !assert.Empty(c, tasks.Failures) || !assert.Len(c, tasks.Tasks, 1) {
					return
				}
				assert.Equal(c, "RUNNING", aws.ToString(tasks.Tasks[0].LastStatus))
				assert.Equal(c, provider, aws.ToString(tasks.Tasks[0].CapacityProviderName))
				assert.Equal(c, taskDefinition, aws.ToString(tasks.Tasks[0].TaskDefinitionArn))
			}, 2*time.Minute, 5*time.Second)
		})
	}
	pt.Preview(t, optpreview.ExpectNoChanges())
}
