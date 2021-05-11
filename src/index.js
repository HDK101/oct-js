const nuTrayCore = require("./App/NuTrayCore");
const { resolve } = require("path");
const { watch } = require("fs");
const { readFile } = require("fs/promises");


async function start() {
  nuTrayCore.setId(25);
  nuTrayCore.setThemePath(resolve(__dirname, "..", "theme"));

  const fileJson = await readFile(resolve(__dirname, "..", "token-data.json"), { encoding: "utf-8" });
  const { key, password } = JSON.parse(fileJson);

  nuTrayCore.setToken(key, password);

  /* const content = await nuTrayCore.getAsset("/elements/header.html");
  nuTrayCore.saveAsset("/elements/header.html", content); */

  // nuTrayCore.downloadAssets();
  // nuTrayCore.uploadAsset("/js/modules/theme.js", "test");
  // await nuTrayCore.uploadAsset("/elements/bruh.html", "aaa");
  /* await nuTrayCore.uploadAllAssets(); */
  nuTrayCore.watch();
  // await nuTrayCore.downloadAssets();
}

start();

/* watch(resolve(__dirname, "..", "theme"), (eventType, filename) => {
  console.log(`Event type: ${eventType}`);
  if (filename) {
    console.log(`Filename: ${filename}`);
  }
}); */

