import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as utils from "./../utils";

export class User extends pulumi.ComponentResource {
    public readonly user: aws.iam.User;
    public readonly groupMembership?: aws.iam.UserGroupMembership;
    public readonly accessKey?: aws.iam.AccessKey;

    constructor(name: string, args: UserArgs = {}, opts?: pulumi.CustomResourceOptions) {
        super(`awsinfra:x:iam:User`, name, args, opts);

        // Save group membership and access key args so we can define them inline.
        const groupMembership = args.groupMembership;
        const accessKey = args.accessKey;

        // Explicitly delete these props so we do *not* pass them into the User created
        // below.
        delete args.groupMembership;
        delete args.accessKey;
        delete args.user;

        this.user = args.user || new aws.iam.User(name, args && args, { parent: this });

        if (groupMembership !== undefined) {
            this.groupMembership = new aws.iam.UserGroupMembership(
                name,
                { ...groupMembership, user: this.user.name },
                { parent: this }
            );
        }

        if (accessKey == "create") {
            this.accessKey = new aws.iam.AccessKey(
                name,
                { user: this.user.name },
                { parent: this }
            );
        } else if (args && accessKey !== undefined && accessKey != "create") {
            this.accessKey = new aws.iam.AccessKey(
                name,
                { ...accessKey, user: this.user.name },
                { parent: this }
            );
        }
    }

    public static fromExistingId(
        name: string,
        id: pulumi.Input<string>,
        args: UserArgs = {},
        opts: pulumi.ComponentResourceOptions = {}
    ) {
        return new User(name, { ...args, user: aws.iam.User.get(name, id, {}, opts) }, opts);
    }
}

type OverwriteUserArgs = utils.Overwrite<
    aws.iam.UserArgs,
    {
        accessKey?: "create" | AccessKeyArgs;
        groupMembership?: UserGroupMembershipArgs;
        user?: aws.iam.User;
    }
>;

/**
 * The set of arguments for constructing a User resource.
 */
export interface UserArgs {
    /**
     * When destroying this user, destroy even if it
     * has non-Terraform-managed IAM access keys, login profile or MFA devices. Without `force_destroy`
     * a user with non-Terraform-managed access keys and login profile will fail to be destroyed.
     */
    readonly forceDestroy?: pulumi.Input<boolean>;

    /**
     * Configuration for access keys for this IAM User.
     */
    accessKey?: "create" | AccessKeyArgs;

    /**
     * The IAM Groups this User belongs to.
     */
    groupMembership?: UserGroupMembershipArgs;

    /**
     * The user's name. The name must consist of upper and lowercase alphanumeric characters with no spaces. You can also include any of the following characters: `=,.@-_.`. User names are not distinguished by case. For example, you cannot create users named both "TESTUSER" and "testuser".
     */
    readonly name?: pulumi.Input<string>;

    /**
     * Path in which to create the user.
     */
    readonly path?: pulumi.Input<string>;

    /**
     * The ARN of the policy that is used to set the permissions boundary for the user.
     */
    readonly permissionsBoundary?: pulumi.Input<string>;

    /**
     * Key-value mapping of tags for the IAM user
     */
    readonly tags?: pulumi.Input<{
        [key: string]: any;
    }>;

    /**
     * An existing User to use for this awsinfra User.  If not provided, a default one will be
     * created.
     */
    user?: aws.iam.User;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteUserArgs, UserArgs>();

type OverwriteUserGroupMembershipArgs = utils.Overwrite<
    aws.iam.UserGroupMembershipArgs,
    { user?: never }
>;

/**
 * The set of arguments for constructing a UserGroupMembership resource.
 */
export interface UserGroupMembershipArgs {
    /**
     * A list of [IAM Groups][1] to add the user to
     */
    readonly groups: pulumi.Input<pulumi.Input<string>[]>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test2: string = utils.checkCompat<
    OverwriteUserGroupMembershipArgs,
    UserGroupMembershipArgs
>();

type OverwriteAccessKeyArgs = utils.Overwrite<aws.iam.AccessKeyArgs, { user?: never }>;

/**
 * The set of arguments for constructing a AccessKey resource.
 */
export interface AccessKeyArgs {
    /**
     * Either a base-64 encoded PGP public key, or a
     * keybase username in the form `keybase:some_person_that_exists`.
     */
    readonly pgpKey?: pulumi.Input<string>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test3: string = utils.checkCompat<OverwriteAccessKeyArgs, AccessKeyArgs>();

/**
 * EmployeeUser represents an AWS IAM User that is a full-time employee. Because it is useful to
 * quickly distinguish between various types of users, all EmployeeUsers are allocated names of the
 * form `employee.${name}`.
 */
export class EmployeeUser extends User {
    /**
     * Create a EmployeeUser resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource. This name will be transformed into the form
     * `employee.${name}`.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: UserArgs, opts?: pulumi.CustomResourceOptions) {
        super(`employee.${name}`, args, opts);
    }
}

/**
 * ContractorUser represents an AWS IAM User that is a contracting employee. Because it is useful to
 * quickly distinguish between various types of users, all ContractorUsers are allocated names of
 * the form `contractor.${name}`.
 */
export class ContractorUser extends User {
    /**
     * Create a ContractorUser resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource. This name will be transformed into the form
     * `contractor.${name}`.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: UserArgs, opts?: pulumi.CustomResourceOptions) {
        super(`contractor.${name}`, args, opts);
    }
}

/**
 * BotUser represents an AWS IAM User that is a bot, such as a CI system. Because it is useful to
 * quickly distinguish between various types of users, all BotUsers are allocated names of the form
 * `bot.${name}`.
 */
export class BotUser extends User {
    /**
     * Create a BotUser resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource. This name will be transformed into the form
     * `bot.${name}`.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: UserArgs, opts?: pulumi.CustomResourceOptions) {
        super(`bot.${name}`, args, opts);
    }
}
