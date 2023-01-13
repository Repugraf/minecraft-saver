const { resolve } = require("path");
const fs = require("fs");
const os = require("os");
const AWS = require("aws-sdk");

module.exports.fileExt = ".zip";
module.exports.dataFile = resolve(__dirname, "data.json");

module.exports.getConfigAndInitS3 = () => {
  const config = getConfig();
  const s3 = new AWS.S3({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });

  return { config, s3 };
};

module.exports.commandWrapper = async  cb => {
  try {
    await cb();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports.getGameSavePath = () => {
  const username = os.userInfo().username;

  switch (os.platform()) {
    case "win32":
      return `C:\\Users\\${username}\\AppData\\Roaming\\.minecraft\\saves`;
    case "darwin":
      return `/Users/${username}/Library/Application Support/minecraft/saves`;
    default:
      return `/home/${username}/.minecraft/saves`;
  }
};

module.exports.getDirs = () => ({ tmpDir: os.tmpdir(), savesPath: this.getGameSavePath() });

/**
 * @returns {{ accessKeyId: string, secretAccessKey: string, region: string, bucket: string, }}
 *  */
module.exports.getConfig = () => {
  if (!fs.existsSync(this.dataFile))
    throw new Error(
      "The CLI is not configured with AWS credentials. Please run `setup-config` command first"
    );

  return require(this.dataFile);
};

module.exports.printConfig = () => {
  fs.existsSync(this.dataFile)
    ? console.log(fs.readFileSync(this.dataFile).toString())
    : console.log("Not configured!");
};

/**
 * @returns {{ accessKeyId: string, secretAccessKey: string, region: string, bucket: string, }}
 *  */
const getConfig = () => {
  if (!fs.existsSync(this.dataFile))
    throw new Error(
      "The CLI is not configured with AWS credentials. Please run `setup-config` command first"
    );

  return require(this.dataFile);
};

module.exports.accessKeyIdRegExp = /^[A-Z0-9]{20}$/;
module.exports.secretAccessKeyRegExp = /^[A-Za-z0-9/+]{40}$/;
module.exports.regionRegExp = /^[a-z]{2}-[a-z]+-\d$/;
