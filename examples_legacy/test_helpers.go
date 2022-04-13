// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package example

import (
	"math/rand"
	"testing"

	"github.com/aws/aws-sdk-go/aws/session"
	cognito "github.com/aws/aws-sdk-go/service/cognitoidentityprovider"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func getCognitoUserToken(t *testing.T, stack integration.RuntimeValidationStackInfo) string {
	userPoolID := stack.Outputs["cognitoPoolId"].(string)
	clientID := stack.Outputs["cognitoClientId"].(string)
	userName := "testing"
	tempPassword := randPassword(8)
	password := randPassword(8)

	client := cognito.New(session.Must(session.NewSession()))
	createUser(t, client, userPoolID, userName, tempPassword)

	adminInitAuth := initiateAuth(t, client, clientID, userPoolID, userName, tempPassword)

	respondToAuthChallenge(t, client, adminInitAuth, clientID, userName, password)

	adminInitAuth = initiateAuth(t, client, clientID, userPoolID, userName, password)

	return *adminInitAuth.AuthenticationResult.IdToken
}

func randPassword(n int) string {
	letters := []rune("abcdefghijklmnopqrstuvwxyz")
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b) + "A$1"
}

func createUser(t *testing.T, client *cognito.CognitoIdentityProvider, userPoolID, userName, tempPassword string) {
	msgAction := "SUPPRESS"
	emailName := "email"
	emailVal := "test@pulumi.com"
	emailVerifiedName := "email_verified"
	emailVerifiedVal := "true"

	_, err := client.AdminCreateUser(&cognito.AdminCreateUserInput{
		UserPoolId:        &userPoolID,
		Username:          &userName,
		MessageAction:     &msgAction,
		TemporaryPassword: &tempPassword,
		UserAttributes: []*cognito.AttributeType{
			{
				Name:  &emailName,
				Value: &emailVal,
			},
			{
				Name:  &emailVerifiedName,
				Value: &emailVerifiedVal,
			},
		},
	})
	if err != nil {
		t.Errorf("failed to create user: %v", err)
	}
}

func initiateAuth(t *testing.T, client *cognito.CognitoIdentityProvider, clientID, userPoolID, userName, password string) *cognito.AdminInitiateAuthOutput {
	authFlow := "ADMIN_NO_SRP_AUTH"
	adminInitAuth, err := client.AdminInitiateAuth(&cognito.AdminInitiateAuthInput{
		AuthFlow:   &authFlow,
		ClientId:   &clientID,
		UserPoolId: &userPoolID,
		AuthParameters: map[string]*string{
			"USERNAME": &userName,
			"PASSWORD": &password,
		},
	})
	if err != nil {
		t.Errorf("failed to initiate auth: %v", err)
	}
	return adminInitAuth
}

func respondToAuthChallenge(t *testing.T, client *cognito.CognitoIdentityProvider, adminInitAuth *cognito.AdminInitiateAuthOutput, clientID, userName, password string) {
	_, err := client.RespondToAuthChallenge(&cognito.RespondToAuthChallengeInput{
		ChallengeName: adminInitAuth.ChallengeName,
		ClientId:      &clientID,
		ChallengeResponses: map[string]*string{
			"USERNAME":     &userName,
			"NEW_PASSWORD": &password,
		},
		Session: adminInitAuth.Session,
	})
	if err != nil {
		t.Errorf("failed to response auth challenge: %v", err)
	}
}
