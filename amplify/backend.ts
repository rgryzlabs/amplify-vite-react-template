import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { chatFunction } from './backend/function/chatFunction';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  storage,
  chatFunction
});

// Add Secrets Manager permissions to the chat function
backend.functions.chatFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['*'] // You might want to restrict this to specific secrets
  })
);
