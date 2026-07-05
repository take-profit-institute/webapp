/**
 * batch-service admin control gRPC client.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import type { BatchExecution, BatchExecutionStatus, BatchJob } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import {
  BatchControlServiceDefinition,
  JobExecutionStatus,
  type JobExecutionResponse,
} from './gen/candle/batch/v1/batch';

type BatchControlClient = Client<typeof BatchControlServiceDefinition>;

let batchClient: BatchControlClient | null = null;

function batch(): BatchControlClient {
  return (batchClient ??= createClient(BatchControlServiceDefinition, getChannel(env.grpc.batchAddr)));
}

function callMetadata(idempotencyKey: string): Metadata {
  return Metadata({ 'x-idempotency-key': idempotencyKey });
}

function toStatus(status: JobExecutionStatus): BatchExecutionStatus {
  switch (status) {
    case JobExecutionStatus.JOB_EXECUTION_STATUS_STARTING:
      return 'starting';
    case JobExecutionStatus.JOB_EXECUTION_STATUS_STARTED:
      return 'started';
    case JobExecutionStatus.JOB_EXECUTION_STATUS_STOPPING:
      return 'stopping';
    case JobExecutionStatus.JOB_EXECUTION_STATUS_STOPPED:
      return 'stopped';
    case JobExecutionStatus.JOB_EXECUTION_STATUS_FAILED:
      return 'failed';
    case JobExecutionStatus.JOB_EXECUTION_STATUS_COMPLETED:
      return 'completed';
    case JobExecutionStatus.JOB_EXECUTION_STATUS_ABANDONED:
      return 'abandoned';
    default:
      return 'unknown';
  }
}

function optionalIso(value?: Date): string | undefined {
  return value ? value.toISOString() : undefined;
}

function toExecution(execution: JobExecutionResponse): BatchExecution {
  return {
    executionId: Number(execution.executionId),
    instanceId: Number(execution.instanceId),
    jobName: execution.jobName,
    status: toStatus(execution.status),
    parameters: execution.parameters,
    createTime: optionalIso(execution.createTime) ?? new Date(0).toISOString(),
    ...(execution.startTime ? { startTime: execution.startTime.toISOString() } : {}),
    ...(execution.endTime ? { endTime: execution.endTime.toISOString() } : {}),
    ...(execution.lastUpdated ? { lastUpdated: execution.lastUpdated.toISOString() } : {}),
    exitCode: execution.exitCode,
    exitDescription: execution.exitDescription,
  };
}

export async function grpcListBatchJobs(): Promise<BatchJob[]> {
  const res = await batch().listJobs({});
  return res.jobs.map((job) => ({
    name: job.name,
    description: job.description,
    supportedParameters: job.supportedParameters,
    triggerable: job.triggerable,
  }));
}

export async function grpcTriggerBatchJob(
  jobName: string,
  parameters: Record<string, string>,
  idempotencyKey: string,
): Promise<BatchExecution> {
  const res = await batch().triggerJob(
    {
      jobName,
      parameters,
      commandMetadata: { idempotencyKey },
    },
    { metadata: callMetadata(idempotencyKey) },
  );
  if (!res.execution) {
    throw new Error('Batch trigger response did not include execution.');
  }
  return toExecution(res.execution);
}

export async function grpcGetBatchExecution(executionId: string): Promise<BatchExecution> {
  const res = await batch().getJobExecution({ executionId });
  if (!res.execution) {
    throw new Error('Batch execution response did not include execution.');
  }
  return toExecution(res.execution);
}

export async function grpcListBatchExecutions(jobName: string, limit: number): Promise<BatchExecution[]> {
  const res = await batch().listJobExecutions({ jobName, limit });
  return res.executions.map(toExecution);
}
