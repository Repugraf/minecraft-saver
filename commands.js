const { resolve } = require("path");
const fs = require("fs");

const zl = require("zip-lib");
const prompts = require("prompts");
const { filesize } = require("filesize");
const {
  accessKeyIdRegExp,
  secretAccessKeyRegExp,
  regionRegExp,
  dataFile,
  getConfigAndInitS3,
  getDirs,
  fileExt
} = require("./util");

module.exports.printConfig = () => {
  fs.existsSync(dataFile)
    ? console.log(fs.readFileSync(dataFile).toString())
    : console.log("Not configured!");
};

module.exports.setupConfig = async () => {
  const { accessKeyId } = await prompts({
    type: "text",
    name: "accessKeyId",
    message: "Provide AWS Access Key Id",
    validate: v => accessKeyIdRegExp.test(v) || "Please provide valid AWS Access Key Id!"
  });

  if (!accessKeyId) return process.exit(0);

  const { secretAccessKey } = await prompts({
    type: "text",
    name: "secretAccessKey",
    message: "Provide AWS Secret Access Key",
    validate: v => secretAccessKeyRegExp.test(v) || "Please provide valid AWS Secret Access Key!"
  });

  if (!secretAccessKey) return process.exit(0);

  const { region } = await prompts({
    type: "text",
    name: "region",
    message: "Provide AWS region",
    validate: v => regionRegExp.test(v) || "Please provide valid AWS region"
  });

  if (!region) return process.exit(0);

  const { bucket } = await prompts({
    type: "text",
    name: "bucket",
    message: "Provide AWS bucket"
  });

  if (!bucket) return process.exit(0);

  fs.writeFileSync(
    dataFile,
    JSON.stringify(
      {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: region.trim(),
        bucket: bucket.trim()
      },
      null,
      2
    )
  );

  console.log("Config has been saved!");
};

module.exports.save = async () => {
  const {
    s3,
    config: { bucket }
  } = getConfigAndInitS3();
  const { tmpDir, savesPath } = getDirs();

  const savedWorlds = [];

  const saves = fs
    .readdirSync(savesPath)
    .filter(save => fs.lstatSync(resolve(savesPath, save)).isDirectory);

  const { selectedSaveIndex } = await prompts({
    type: "select",
    message: "Which world do you want to save?",
    name: "selectedSaveIndex",
    choices: [
      { title: "All of them", description: "Will save all of the worlds found" },
      ...saves.map(s => ({ title: s }))
    ]
  });

  console.log("");

  if (selectedSaveIndex === undefined) return process.exit(0);

  if (selectedSaveIndex === 0)
    for (const save of saves)
      savedWorlds.push(await saveOneWorld(save, savesPath, tmpDir, s3, bucket));
  else
    savedWorlds.push(
      await saveOneWorld(saves[selectedSaveIndex - 1], savesPath, tmpDir, s3, bucket)
    );

  console.log("");

  console.log("Saved worlds:\n", savedWorlds.map(w => `  - ${w}`).join("\n"));
};

/**
 *
 * @param {string} save
 * @param {string} savesPath
 * @param {string} tmpDir
 * @param {import('aws-sdk').S3} s3
 * @param {string} bucket
 * @returns
 */
const saveOneWorld = async (save, savesPath, tmpDir, s3, bucket) => {
  const currentSaved = resolve(savesPath, save);

  const zippedFileName = `${save}${fileExt}`;
  const zippedFilePath = resolve(tmpDir, zippedFileName);

  await zl.archiveFolder(currentSaved, zippedFilePath);

  process.stdout.write(`Starting to upload ${zippedFileName}`);

  await s3
    .upload({
      Bucket: bucket,
      Key: zippedFileName,
      Body: fs.readFileSync(zippedFilePath)
    })
    .on("httpUploadProgress", ({ loaded, total }) =>
      writeLine(`${zippedFileName} ${filesize(loaded)}/${filesize(total)}`)
    )
    .promise();

  writeLine(`Uploaded ${zippedFileName} successfully\n`);

  fs.rmSync(zippedFilePath);

  return save;
};

module.exports.pull = async () => {
  const {
    s3,
    config: { bucket }
  } = getConfigAndInitS3();
  const { tmpDir, savesPath } = getDirs();

  const bucketResponse = await s3.listObjects({ Bucket: bucket }).promise();

  const filteredWorlds = bucketResponse?.Contents?.filter(el => el.Key?.endsWith(fileExt));

  if (!filteredWorlds?.length) return console.log("No worlds found in AWS bucket");

  const { selectedWorldIndex } = await prompts({
    type: "select",
    message: "Which world do you want to pull?",
    name: "selectedWorldIndex",
    choices: [
      { title: "All of them", description: "Will pull all of the worlds found in AWS S3 bucket" },
      ...filteredWorlds.map(w => ({ title: w.Key }))
    ]
  });

  if (selectedWorldIndex === undefined) return process.exit(0);

  console.log("");

  /** @type {Array<{key: string, path: string}>} */
  const pulledWorlds = [];

  if (selectedWorldIndex === 0) {
    (
      await Promise.all(
        bucketResponse.Contents.filter(el => el.Key?.endsWith(fileExt)).map(obj =>
          pullOneWorld(s3, obj, bucket, tmpDir)
        )
      )
    ).forEach(w => pulledWorlds.push(w));
  } else {
    const obj = filteredWorlds[selectedWorldIndex - 1];
    pulledWorlds.push(await pullOneWorld(s3, obj, bucket, tmpDir));
  }

  await Promise.all(
    pulledWorlds.map(world =>
      zl.extract(world.path, resolve(savesPath, world.key), { overwrite: true })
    )
  );

  console.log("");

  console.log("Pulled Worlds:\n", pulledWorlds.map(w => `  - ${w.key}`).join("\n"));
};

/**
 * @param {import('aws-sdk').S3} s3
 * @param {import('aws-sdk').S3.Object} obj
 * @param {string} bucket
 * @param {string} tmpDir
 * @returns {Promise<{key: string, path: string}>}
 * */
const pullOneWorld = (s3, obj, bucket, tmpDir) =>
  new Promise(async (res, rej) => {
    try {
      const path = resolve(tmpDir, obj.Key);

      const keyParts = obj.Key.split(".");
      keyParts.pop();
      const key = keyParts.join(".");

      process.stdout.write(`Starting to download ${obj.Key}`);
      const readStream = s3.getObject({ Bucket: bucket, Key: obj.Key }).createReadStream();
      const writeStream = fs.createWriteStream(path);

      let totalUploaded = 0;

      readStream.pipe(writeStream);
      readStream.on("data", chunk => {
        writeLine(
          `${obj.Key} ${filesize((totalUploaded += chunk.byteLength))}/${filesize(obj.Size)}`
        );
      });
      readStream.on("end", () => {
        writeLine(`Downloaded ${obj.Key} successfully\n`);
        return res({ key, path });
      });
      readStream.on("error", rej);
    } catch (error) {
      rej(error);
    }
  });

/** @param {string} message */
const writeLine = message => {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(message);
};
