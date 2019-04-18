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

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as cloudwatch from "../cloudwatch";

export namespace metrics {
    export type RdsMetricName =
        "BinLogDiskUsage" | "BurstBalance" | "CPUUtilization" | "CPUCreditUsage" | "CPUCreditBalance" |
        "DatabaseConnections" | "DiskQueueDepth" | "FailedSQLServerAgentJobsCount" |
        "FreeableMemory" | "FreeStorageSpace" | "MaximumUsedTransactionIDs" |
        "NetworkReceiveThroughput" | "NetworkTransmitThroughput" | "OldestReplicationSlotLag" |
        "ReadIOPS" | "ReadLatency" | "ReadThroughput" |
        "ReplicaLag" | "ReplicationSlotDiskUsage" | "SwapUsage" |
        "TransactionLogsDiskUsage" | "TransactionLogsGeneration" |
        "WriteIOPS" | "WriteLatency" | "WriteThroughput" |

        // aurora metrics
        "ActiveTransactions" |
        "AuroraBinlogReplicaLag" |
        "AuroraGlobalDBReplicatedWriteIO" |
        "AuroraGlobalDBDataTransferBytes" |
        "AuroraGlobalDBReplicationLag" |
        "AuroraReplicaLag" |
        "AuroraReplicaLagMaximum" |
        "AuroraReplicaLagMinimum" |
        "BacktrackChangeRecordsCreationRate" |
        "BacktrackChangeRecordsStored" |
        "BacktrackWindowActual" |
        "BacktrackWindowAlert" |
        "BackupRetentionPeriodStorageUsed" |
        "BinLogDiskUsage" |
        "BlockedTransactions" |
        "BufferCacheHitRatio" |
        "CommitLatency" |
        "CommitThroughput" |
        "CPUCreditBalance" |
        "CPUCreditUsage" |
        "CPUUtilization" |
        "DatabaseConnections" |
        "DDLLatency" |
        "DDLThroughput" |
        "Deadlocks" |
        "DeleteLatency" |
        "DeleteThroughput" |
        "DiskQueueDepth" |
        "DMLLatency" |
        "DMLThroughput" |
        "EngineUptime" |
        "FreeableMemory" |
        "FreeLocalStorage" |
        "InsertLatency" |
        "InsertThroughput" |
        "LoginFailures" |
        "MaximumUsedTransactionIDs" |
        "NetworkReceiveThroughput" |
        "NetworkThroughput" |
        "NetworkTransmitThroughput" |
        "Queries" |
        "RDSToAuroraPostgreSQLReplicaLag" |
        "ReadIOPS" |
        "ReadLatency" |
        "ReadThroughput" |
        "ResultSetCacheHitRatio" |
        "SelectLatency" |
        "SelectThroughput" |
        "SnapshotStorageUsed" |
        "SwapUsage" |
        "TotalBackupStorageBilled" |
        "TransactionLogsDiskUsage" |
        "UpdateLatency" |
        "UpdateThroughput" |
        "VolumeBytesUsed" |
        "VolumeReadIOPs" |
        "VolumeWriteIOPs" |
        "WriteIOPS" |
        "WriteLatency" |
        "WriteThroughput";

    export interface RdsMetricChange extends cloudwatch.MetricChange {
        /**
         * Optional [Instance] to filter down events to.
         */
        instance?: aws.rds.Instance;

        /**
         * Optional [Cluster] to filter down events to.
         */
        cluster?: aws.rds.Cluster;

        /**
         * This dimension filters the data you request for a specific Aurora DB cluster, aggregating
         * the metric by instance role (WRITER/READER). For example, you can aggregate metrics for
         * all READER instances that belong to a cluster.
         *
         * If this is provided then [cluster] must be provided as well.
         */
        role?: "WRITER" | "READER";

        /**
         * This dimension filters the data you request for all instances in a database class. For
         * example, you can aggregate metrics for all instances that belong to the database class
         * [db.m1.small].
         */
        databaseClass?: string;

        /**
         * This dimension filters the data you request for the identified engine name only. For
         * example, you can aggregate metrics for all instances that have the engine name [mysql].
         */
        engineName?: string;

        /**
         * This dimension filters the data you request for the specified region only. For example,
         * you can aggregate metrics for all instances in the region [us-east-1].
         */
        sourceRegion?: aws.Region;
    }

    /**
     * Creates an AWS/RDS metric with the requested [metricName]. See
     * https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MonitoringOverview.html#monitoring-cloudwatch
     * for list of all metric-names.
     *
     * Note, individual metrics can easily be obtained without supplying the name using the other
     * [metricXXX] functions.
     *
     * You can monitor DB instances using Amazon CloudWatch, which collects and processes raw data from
     * Amazon RDS into readable, near real-time metrics. These statistics are recorded for a period of
     * two weeks, so that you can access historical information and gain a better perspective on how
     * your web application or service is performing. By default, Amazon RDS metric data is
     * automatically sent to CloudWatch in 1-minute periods.
     *
     * Amazon RDS metrics data can be filtered by using any of the following dimensions:
     * 1. "DBInstanceIdentifier": This dimension filters the data you request for a specific database
     *    instance.
     * 2. "DBClusterIdentifier": This dimension filters the data you request for a specific Amazon
     *    Aurora DB cluster.
     * 3. "DBClusterIdentifier, Role": This dimension filters the data you request for a specific Aurora
     *    DB cluster, aggregating the metric by instance role (WRITER/READER). For example, you can
     *    aggregate metrics for all READER instances that belong to a cluster.
     * 4. "DatabaseClass": This dimension filters the data you request for all instances in a database
     *    class. For example, you can aggregate metrics for all instances that belong to the database
     *    class db.m1.small
     * 5. "EngineName": This dimension filters the data you request for the identified engine name only.
     *    For example, you can aggregate metrics for all instances that have the engine name mysql.
     * 6. "SourceRegion": This dimension filters the data you request for the specified region only. For
     *    example, you can aggregate metrics for all instances in the region us-east-1.
     */
    function metric(metricName: RdsMetricName, change: RdsMetricChange = {}) {
        const dimensions: Record<string, any> = {};
        if (change.cluster !== undefined) {
            dimensions.DBClusterIdentifier = change.cluster.id;
        }
        if (change.instance !== undefined) {
            dimensions.DBInstanceIdentifier = change.instance.id;
        }
        if (change.role !== undefined) {
            dimensions.Role = change.role;
        }
        if (change.databaseClass !== undefined) {
            dimensions.DatabaseClass = change.databaseClass;
        }
        if (change.engineName !== undefined) {
            dimensions.EngineName = change.engineName;
        }
        if (change.sourceRegion !== undefined) {
            dimensions.SourceRegion = change.sourceRegion;
        }

        return new cloudwatch.Metric({
            namespace: "AWS/RDS",
            name: metricName,
            ...change,
        }).withDimensions(dimensions);
    }

    /**
     * The amount of disk space occupied by binary logs on the master. Applies to MySQL read
     * replicas.
     *
     * Units: Bytes
     */
    export function binLogDiskUsage(change?: RdsMetricChange) {
        return metric("BinLogDiskUsage", { unit: "Bytes", ...change });
    }

    /**
     * The percent of General Purpose SSD (gp2) burst-bucket I/O credits available.
     *
     * Units: Percent
     */
    export function burstBalance(change?: RdsMetricChange) {
        return metric("BurstBalance", { unit: "Percent", ...change });
    }

    /**
     * The percentage of CPU utilization.
     *
     * Units: Percent
     */
    export function cpuUtilization(change?: RdsMetricChange) {
        return metric("CPUUtilization", { unit: "Percent", ...change });
    }

    /**
     * [T2 instances] The number of CPU credits spent by the instance for CPU utilization. One CPU
     * credit equals one vCPU running at 100% utilization for one minute or an equivalent
     * combination of vCPUs, utilization, and time (for example, one vCPU running at 50% utilization
     * for two minutes or two vCPUs running at 25% utilization for two minutes).
     *
     * CPU credit metrics are available at a five-minute frequency only. If you specify a period
     * greater than five minutes, use the Sum statistic instead of the Average statistic.
     */
    export function cpuCreditUsage(change?: RdsMetricChange) {
        return metric("CPUCreditUsage", change);
    }

    /**
     * [T2 instances] The number of earned CPU credits that an instance has accrued since it was
     * launched or started. For T2 Standard, the CPUCreditBalance also includes the number of launch
     * credits that have been accrued.
     *
     * Credits are accrued in the credit balance after they are earned, and removed from the credit
     * balance when they are spent. The credit balance has a maximum limit, determined by the
     * instance size. Once the limit is reached, any new credits that are earned are discarded. For
     * T2 Standard, launch credits do not count towards the limit.
     *
     * The credits in the CPUCreditBalance are available for the instance to spend to burst beyond
     * its baseline CPU utilization.
     *
     * When an instance is running, credits in the CPUCreditBalance do not expire. When the instance
     * stops, the CPUCreditBalance does not persist, and all accrued credits are lost.
     *
     * CPU credit metrics are available at a five-minute frequency only.
     */
    export function cpuCreditBalance(change?: RdsMetricChange) {
        return metric("CPUCreditBalance", change);
    }

    /**
     * The number of database connections in use.
     *
     * Units: Count
     */
    export function databaseConnections(change?: RdsMetricChange) {
        return metric("DatabaseConnections", { unit: "Count", ...change });
    }

    /**
     * The number of outstanding IOs (read/write requests) waiting to access the disk.
     *
     * Units: Count
     */
    export function diskQueueDepth(change?: RdsMetricChange) {
        return metric("DiskQueueDepth", { unit: "Count", ...change });
    }

    /**
     * The number of failed SQL Server Agent jobs during the last minute.
     *
     * Unit: Count/Minute
     */
    export function failedSQLServerAgentJobsCount(change?: RdsMetricChange) {
        return metric("FailedSQLServerAgentJobsCount", { period: 60, unit: "Count", ...change });
    }

    /**
     * The amount of available random access memory.
     *
     * Units: Bytes
     */
    export function freeableMemory(change?: RdsMetricChange) {
        return metric("FreeableMemory", { unit: "Bytes", ...change });
    }

    /**
     * The amount of available storage space.
     *
     * Units: Bytes
     */
    export function freeStorageSpace(change?: RdsMetricChange) {
        return metric("FreeStorageSpace", { unit: "Bytes", ...change });
    }

    /**
     * The maximum transaction ID that has been used. Applies to PostgreSQL.
     *
     * Units: Count
     */
    export function maximumUsedTransactionIDs(change?: RdsMetricChange) {
        return metric("MaximumUsedTransactionIDs", { unit: "Count", ...change });
    }

    /**
     * The incoming (Receive) network traffic on the DB instance, including both customer database
     * traffic and Amazon RDS traffic used for monitoring and replication.
     *
     * Units: Bytes/Second
     */
    export function networkReceiveThroughput(change?: RdsMetricChange) {
        return metric("NetworkReceiveThroughput", { unit: "Bytes/Second", ...change });
    }

    /**
     * The outgoing (Transmit) network traffic on the DB instance, including both customer database
     * traffic and Amazon RDS traffic used for monitoring and replication.
     *
     * Units: Bytes/Second
     */
    export function networkTransmitThroughput(change?: RdsMetricChange) {
        return metric("NetworkTransmitThroughput", { unit: "Bytes/Second", ...change });
    }

    /**
     * The lagging size of the replica lagging the most in terms of WAL data received. Applies to
     * PostgreSQL.
     *
     * Units: Megabytes
     */
    export function oldestReplicationSlotLag(change?: RdsMetricChange) {
        return metric("OldestReplicationSlotLag", { unit: "Megabytes", ...change });
    }

    /**
     * The average number of disk read I/O operations per second.
     *
     * Units: Count/Second
     */
    export function readIOPS(change?: RdsMetricChange) {
        return metric("ReadIOPS", { unit: "Count/Second", ...change });
    }

    /**
     * The average amount of time taken per disk I/O operation.
     *
     * Units: Seconds
     */
    export function readLatency(change?: RdsMetricChange) {
        return metric("ReadLatency", { unit: "Seconds", ...change });
    }

    /**
     * The average number of bytes read from disk per second.
     *
     * Units: Bytes/Second
     */
    export function readThroughput(change?: RdsMetricChange) {
        return metric("ReadThroughput", { unit: "Bytes/Second", ...change });
    }

    /**
     * The amount of time a Read Replica DB instance lags behind the source DB instance. Applies to
     * MySQL, MariaDB, and PostgreSQL Read Replicas.
     *
     * Units: Seconds
     */
    export function replicaLag(change?: RdsMetricChange) {
        return metric("ReplicaLag", { unit: "Seconds", ...change });
    }

    /**
     * The disk space used by replication slot files. Applies to PostgreSQL.
     *
     * Units: Megabytes
     */
    export function replicationSlotDiskUsage(change?: RdsMetricChange) {
        return metric("ReplicationSlotDiskUsage", { unit: "Megabytes", ...change });
    }

    /**
     * The amount of swap space used on the DB instance. This metric is not available for SQL
     * Server.
     *
     * Units: Bytes
     */
    export function swapUsage(change?: RdsMetricChange) {
        return metric("SwapUsage", { unit: "Bytes", ...change });
    }

    /**
     * The disk space used by transaction logs. Applies to PostgreSQL.
     *
     * Units: Megabytes
     */
    export function transactionLogsDiskUsage(change?: RdsMetricChange) {
        return metric("TransactionLogsDiskUsage", { unit: "Megabytes", ...change });
    }

    /**
     * The size of transaction logs generated per second. Applies to PostgreSQL.
     *
     * Units: Megabytes/Second
     */
    export function transactionLogsGeneration(change?: RdsMetricChange) {
        return metric("TransactionLogsGeneration", { unit: "Megabytes/Second", ...change });
    }

    /**
     * The average number of disk write I/O operations per second.
     *
     * Units: Count/Second
     */
    export function writeIOPS(change?: RdsMetricChange) {
        return metric("WriteIOPS", { unit: "Count/Second", ...change });
    }

    /**
     * The average amount of time taken per disk I/O operation.
     *
     * Units: Seconds
     */
    export function writeLatency(change?: RdsMetricChange) {
        return metric("WriteLatency", { unit: "Seconds", ...change });
    }

    /**
     * The average number of bytes written to disk per second.
     *
     * Units: Bytes/Second
     */
    export function writeThroughput(change?: RdsMetricChange) {
        return metric("WriteThroughput", { unit: "Bytes/Second", ...change });
    }

    // aurora functions

    /**
     * The average number of current transactions executing on an Aurora database instance per
     * second. By default, Aurora doesn't enable this metric. To begin measuring this value, set
     * innodb_monitor_enable='all' in the DB parameter group for a specific DB instance.
     *
     * Applies to: Aurora MySQL
     */
    export function activeTransactions(change?: RdsMetricChange) {
        return metric("ActiveTransactions", { ...change });
    }

    /**
     * The amount of time a replica DB cluster running on Aurora with MySQL compatibility lags
     * behind the source DB cluster. This metric reports the value of the Seconds_Behind_Master
     * field of the MySQL SHOW SLAVE STATUS command. This metric is useful for monitoring replica
     * lag between Aurora DB clusters that are replicating across different AWS Regions. For more
     * information, see Aurora MySQL Replication.
     *
     * Applies to: Aurora MySQL
     */
    export function auroraBinlogReplicaLag(change?: RdsMetricChange) {
        return metric("AuroraBinlogReplicaLag", { ...change });
    }

    /**
     * Units: Bytes
     *
     * Applies to: Aurora MySQL
     */
    export function auroraGlobalDBReplicatedWriteIO(change?: RdsMetricChange) {
        return metric("AuroraGlobalDBReplicatedWriteIO", { unit: "Bytes", ...change });
    }

    /**
     * Units: Bytes
     *
     * Applies to: Aurora MySQL
     */
    export function auroraGlobalDBDataTransferBytes(change?: RdsMetricChange) {
        return metric("AuroraGlobalDBDataTransferBytes", { unit: "Bytes", ...change });
    }

    /**
     * Units: Milliseconds
     *
     * Applies to: Aurora MySQL
     */
    export function auroraGlobalDBReplicationLag(change?: RdsMetricChange) {
        return metric("AuroraGlobalDBReplicationLag", { unit: "Milliseconds", ...change });
    }

    /**
     * For an Aurora Replica, the amount of lag when replicating updates from the primary instance,
     * in milliseconds.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function auroraReplicaLag(change?: RdsMetricChange) {
        return metric("AuroraReplicaLag", { unit: "Milliseconds", ...change });
    }

    /**
     * The maximum amount of lag between the primary instance and each Aurora DB instance in the DB
     * cluster, in milliseconds.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function auroraReplicaLagMaximum(change?: RdsMetricChange) {
        return metric("AuroraReplicaLagMaximum", { unit: "Milliseconds", ...change });
    }

    /**
     * The minimum amount of lag between the primary instance and each Aurora DB instance in the DB
     * cluster, in milliseconds.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function auroraReplicaLagMinimum(change?: RdsMetricChange) {
        return metric("AuroraReplicaLagMinimum", { unit: "Milliseconds", ...change });
    }

    /**
     * The number of backtrack change records created over five minutes for your DB cluster.
     *
     * Applies to: Aurora MySQL
     */
    export function backtrackChangeRecordsCreationRate(change?: RdsMetricChange) {
        return metric("BacktrackChangeRecordsCreationRate", { ...change });
    }

    /**
     * The actual number of backtrack change records used by your DB cluster.
     *
     * Applies to: Aurora MySQL
     */
    export function backtrackChangeRecordsStored(change?: RdsMetricChange) {
        return metric("BacktrackChangeRecordsStored", { ...change });
    }

    /**
     * The difference between the target backtrack window and the actual backtrack window.
     *
     * Applies to: Aurora MySQL
     */
    export function backtrackWindowActual(change?: RdsMetricChange) {
        return metric("BacktrackWindowActual", { ...change });
    }

    /**
     * The number of times that the actual backtrack window is smaller than the target backtrack
     * window for a given period of time.
     *
     * Applies to: Aurora MySQL
     */
    export function backtrackWindowAlert(change?: RdsMetricChange) {
        return metric("BacktrackWindowAlert", { ...change });
    }

    /**
     * The total amount of backup storage in GiB used to support the point-in-time restore feature
     * within the Aurora DB cluster's backup retention window. Included in the total reported by the
     * TotalBackupStorageBilled metric. Computed separately for each Aurora cluster. For
     * instructions, see Understanding Aurora Backup Storage Usage. Units: Gibibytes (GiB)
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function backupRetentionPeriodStorageUsed(change?: RdsMetricChange) {
        return metric("BackupRetentionPeriodStorageUsed", { unit: "Gigabytes", ...change });
    }

    /**
     * The average number of transactions in the database that are blocked per second.
     *
     * Applies to: Aurora MySQL
     */
    export function blockedTransactions(change?: RdsMetricChange) {
        return metric("BlockedTransactions", { ...change });
    }

    /**
     * The percentage of requests that are served by the buffer cache.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function bufferCacheHitRatio(change?: RdsMetricChange) {
        return metric("BufferCacheHitRatio", { ...change });
    }

    /**
     * The amount of latency for commit operations, in milliseconds.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function commitLatency(change?: RdsMetricChange) {
        return metric("CommitLatency", { unit: "Milliseconds", ...change });
    }

    /**
     * The average number of commit operations per second.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function commitThroughput(change?: RdsMetricChange) {
        return metric("CommitThroughput", { ...change });
    }

    /**
     * The amount of latency for data definition language (DDL) requests, in milliseconds—for
     * example, create, alter, and drop requests.
     *
     * Applies to: Aurora MySQL
     */
    export function ddlLatency(change?: RdsMetricChange) {
        return metric("DDLLatency", { ...change });
    }

    /**
     * The average number of DDL requests per second.
     *
     * Applies to: Aurora MySQL
     */
    export function ddlThroughput(change?: RdsMetricChange) {
        return metric("DDLThroughput", { ...change });
    }

    /**
     * The average number of deadlocks in the database per second.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function deadlocks(change?: RdsMetricChange) {
        return metric("Deadlocks", { ...change });
    }

    /**
     * The amount of latency for delete queries, in milliseconds.
     *
     * Applies to: Aurora MySQL
     */
    export function deleteLatency(change?: RdsMetricChange) {
        return metric("DeleteLatency", { unit: "Milliseconds", ...change });
    }

    /**
     * The average number of delete queries per second.
     *
     * Applies to: Aurora MySQL
     */
    export function deleteThroughput(change?: RdsMetricChange) {
        return metric("DeleteThroughput", { ...change });
    }

    /**
     * The amount of latency for inserts, updates, and deletes, in milliseconds.
     *
     * Applies to: Aurora MySQL
     */
    export function dmlLatency(change?: RdsMetricChange) {
        return metric("DMLLatency", { unit: "Milliseconds", ...change });
    }

    /**
     * The average number of inserts, updates, and deletes per second.
     *
     * Applies to: Aurora MySQL
     */
    export function dmlThroughput(change?: RdsMetricChange) {
        return metric("DMLThroughput", { ...change });
    }

    /**
     * The amount of time that the instance has been running, in seconds.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function engineUptime(change?: RdsMetricChange) {
        return metric("EngineUptime", { unit: "Seconds", ...change });
    }

    /**
     * The amount of storage available for temporary tables and logs, in bytes. Unlike for other DB
     * engines, for Aurora DB instances this metric reports the amount of storage available to each
     * DB instance for temporary tables and logs. This value depends on the DB instance class (for
     * pricing information, see the Amazon RDS product page). You can increase the amount of free
     * storage space for an instance by choosing a larger DB instance class for your instance.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function freeLocalStorage(change?: RdsMetricChange) {
        return metric("FreeLocalStorage", { unit: "Bytes", ...change });
    }

    /**
     * The amount of latency for insert queries, in milliseconds.
     *
     * Applies to: Aurora MySQL
     */
    export function insertLatency(change?: RdsMetricChange) {
        return metric("InsertLatency", { unit: "Milliseconds", ...change });
    }

    /**
     * The average number of insert queries per second.
     *
     * Applies to: Aurora MySQL
     */
    export function insertThroughput(change?: RdsMetricChange) {
        return metric("InsertThroughput", { ...change });
    }

    /**
     * The average number of failed login attempts per second.
     *
     * Applies to: Aurora MySQL
     */
    export function loginFailures(change?: RdsMetricChange) {
        return metric("LoginFailures", { ...change });
    }

    /**
     * The amount of network throughput both received from and transmitted to clients by each
     * instance in the Aurora MySQL DB cluster, in bytes per second. This throughput doesn't include
     * network traffic between instances in the DB cluster and the cluster volume.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function networkThroughput(change?: RdsMetricChange) {
        return metric("NetworkThroughput", { unit: "Bytes/Second", ...change });
    }

    /**
     * The average number of queries executed per second.
     *
     * Applies to: Aurora MySQL
     */
    export function queries(change?: RdsMetricChange) {
        return metric("Queries", { ...change });
    }

    /**
     * The amount of lag in seconds when replicating updates from the primary RDS PostgreSQL
     * instance to other nodes in the cluster.
     *
     * Applies to: Aurora PostgreSQL
     */
    export function rdsToAuroraPostgreSQLReplicaLag(change?: RdsMetricChange) {
        return metric("RDSToAuroraPostgreSQLReplicaLag", { ...change });
    }

    /**
     * The percentage of requests that are served by the Resultset cache.
     *
     * Applies to: Aurora MySQL
     */
    export function resultSetCacheHitRatio(change?: RdsMetricChange) {
        return metric("ResultSetCacheHitRatio", { ...change });
    }

    /**
     * The amount of latency for select queries, in milliseconds.
     *
     * Applies to: Aurora MySQL
     */
    export function selectLatency(change?: RdsMetricChange) {
        return metric("SelectLatency", { ...change });
    }

    /**
     * The average number of select queries per second.
     *
     * Applies to: Aurora MySQL
     */
    export function selectThroughput(change?: RdsMetricChange) {
        return metric("SelectThroughput", { ...change });
    }

    /**
     * The total amount of backup storage in GiB consumed by all Aurora snapshots for an Aurora DB
     * cluster outside its backup retention window. Included in the total reported by the
     * TotalBackupStorageBilled metric. Computed separately for each Aurora cluster. For
     * instructions, see Understanding Aurora Backup Storage Usage. Units: Gibibytes (GiB)
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function snapshotStorageUsed(change?: RdsMetricChange) {
        return metric("SnapshotStorageUsed", { unit: "Gigabytes", ...change });
    }

    /**
     * The total amount of backup storage in GiB for which you are billed for a given Aurora DB
     * cluster. Includes the backup storage measured by the BackupRetentionPeriodStorageUsed and
     * SnapshotStorageUsed metrics. Computed separately for each Aurora cluster. For instructions,
     * see Understanding Aurora Backup Storage Usage. Units: Gibibytes (GiB)
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function totalBackupStorageBilled(change?: RdsMetricChange) {
        return metric("TotalBackupStorageBilled", { unit: "Gigabytes", ...change });
    }

    /**
     * The amount of latency for update queries, in milliseconds.
     *
     * Applies to: Aurora MySQL
     */
    export function updateLatency(change?: RdsMetricChange) {
        return metric("UpdateLatency", { ...change });
    }

    /**
     * The average number of update queries per second.
     *
     * Applies to: Aurora MySQL
     */
    export function updateThroughput(change?: RdsMetricChange) {
        return metric("UpdateThroughput", { ...change });
    }

    /**
     * The amount of storage used by your Aurora DB instance, in bytes. This value affects the cost
     * of the Aurora DB cluster (for pricing information, see the Amazon RDS product page).
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function volumeBytesUsed(change?: RdsMetricChange) {
        return metric("VolumeBytesUsed", { unit: "Bytes", ...change });
    }

    /**
     * The number of billed read I/O operations from a cluster volume, reported at 5-minute
     * intervals. Billed read operations are calculated at the cluster volume level, aggregated from
     * all instances in the Aurora DB cluster, and then reported at 5-minute intervals. The value is
     * calculated by taking the value of the Read operations metric over a 5-minute period. You can
     * determine the amount of billed read operations per second by taking the value of the Billed
     * read operations metric and dividing by 300 seconds. For example, if the Billed read
     * operations returns 13,686, then the billed read operations per second is 45 (13,686 / 300 =
     * 45.62). You accrue billed read operations for queries that request database pages that aren't
     * in the buffer cache and therefore must be loaded from storage. You might see spikes in billed
     * read operations as query results are read from storage and then loaded into the buffer cache.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function volumeReadIOPs(change?: RdsMetricChange) {
        return metric("VolumeReadIOPs", { ...change });
    }

    /**
     * The number of write disk I/O operations to the cluster volume, reported at 5-minute
     * intervals. See the description of VolumeReadIOPS above for a detailed description of how
     * billed write operations are calculated.
     *
     * Applies to: Aurora MySQL and Aurora PostgreSQL
     */
    export function volumeWriteIOPs(change?: RdsMetricChange) {
        return metric("VolumeWriteIOPs", { ...change });
    }
}
