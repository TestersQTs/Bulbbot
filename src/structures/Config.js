const fs = require("fs");
const yaml = require("js-yaml");

let fileContents = fs.readFileSync(`${__dirname}/../config.yml`, "utf8");
let data = yaml.load(fileContents);

global.config = data;
