#!/usr/bin/env node
const { resolve } = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { commandWrapper } = require("./util");
const { printConfig, setupConfig, save, pull } = require("./commands");

const version = require(resolve(__dirname, "package.json")).version;

yargs(hideBin(process.argv))
  .command(
    "get-config",
    "Prints current config",
    y => y,
    () => commandWrapper(printConfig)
  )
  .command(
    "setup-config",
    "Setups with necessary AWS configs",
    y => y,
    () => commandWrapper(setupConfig)
  )
  .command(
    "save",
    "Saves current worlds to AWS S3",
    y => y,
    () => commandWrapper(save)
  )
  .command(
    "pull",
    "Pulls worlds from AWS S3 and replaces the current ones",
    y => y,
    () => commandWrapper(pull)
  )
  .version(version)
  .alias("v", "version")
  .help("h")
  .alias("h", "help")
  .showHelpOnFail(true)
  .demandCommand()
  .strict()
  .parse();
