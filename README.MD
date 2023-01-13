# Minecraft World Saver

This package is designed to save Minecraft worlds to AWS S3 bucket. It also supports pulling latest save to local file system.

## Usage

### Setup

Before using this tool a few things need to be done and installed.

1. Install [node.js](https://nodejs.org)
2. Create account on [AWS Account](https://aws.amazon.com/resources/create-account) if you haven't already
3. Create a IAM user with full access to S3 or (full access) on AWS platform. You will need to get `Access Key Id` and `Secret Access Key`. You can use this [tutorial](https://www.techtarget.com/searchcloudcomputing/tutorial/Step-by-step-guide-on-how-to-create-an-IAM-user-in-AWS)
4. Create AWS S3 bucket which will store the Minecraft worlds. You can use this [tutorial](https://cloudkatha.com/how-to-create-s3-bucket-in-aws-step-by-step)
5. Open a terminal and install this cli tool with `npm i -g minecraft-saver`
6. Run `minecraft-saver setup-config`. This will prompt a few inputs:
   - Access Key Id (see step 3)
   - Secret Access Key (see step 3)
   - Region (see step 4)
   - Bucket name (see tep 4)

If all steps are done you can start using this CLI

### Commands

- Saving a world.
  Run `minecraft-saver save`. You'll see a prompt where you can choose a specific world to save or all of them. This will upload the world or worlds to AWS S3 bucket
- Pulling a world.
  Run `minecraft-saver pull`. You'll see a prompt where you can choose a specific world to pull or all of them. This will download the world or worlds from AWS S3 bucket and put it into saves folder. Be aware it will replace local worlds if any exist.
- Checking current config
  `minecraft-saver get-config`
- Resetting current config
  `minecraft-saver setup-config`
