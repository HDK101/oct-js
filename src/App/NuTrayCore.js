const https = require("https");
const { version } = require("./Config/OpenCodeVersion");
const { resolve, dirname, extname } = require("path");
const { promises } = require("dns");
const { writeFile, stat, mkdir, readFile, } = require("fs").promises;
const { encode, decode } = require("./Base64");
const { watch, readdir } = require("fs");


class NuTrayCore {

  setId(id) {
    this.id = id;
  }

  setThemePath(path) {
    this.path = path;
  }

  setToken(key, password) {
    this.token = `Token ${key}_${password}`;
  }

  async getAssetsList() {
    if (typeof this.id === "undefined") {
      throw "Theme ID not set.";
    }

    const options = this._createOptions("GET", `/api/themes/${this.id}/assets`, {}, {});

    return this._request(options, {});
  }

  async getAsset(asset) {
    if (typeof this.id === "undefined") {
      throw "Theme ID not set.";
    }

    const options = this._createOptions("GET", `/api/themes/${this.id}/assets`, {}, { key: asset });
    const file = await this._request(options, {});

    return decode(file["content"]);
  }

  async saveAsset(name, content) {
    /*This functions expects the following model:
     * /folder/file.extension 
     */

    await writeFile(`${this.path}${name}`, content, "utf-8");
    return console.log(`'${name}' saved!`);
  }

  async downloadAssets() {
    const files = await this.getAssetsList();

    var foldersArray = [];

    files["assets"].forEach(file => {
      const filename = file["path"];
      const dir = dirname(filename).split("/");
      dir.shift();
      foldersArray.push(dir);
    });

    foldersArray.sort((a, b) => a.length - b.length);

    var folderStrings = [];
    foldersArray.forEach(folderString => {
      folderStrings.push(folderString.join("/"));
    });

    var uniqueFolderStrings = [...new Set(folderStrings)];

    const createFoldersMap = uniqueFolderStrings.map(async (folderString) => {
      console.log(folderString);

      mkdir(`${this.path}/${folderString}`).catch(err => {
        console.log("Already exists!");
      });

    });

    const downloadFiles = files["assets"].map(async (file) => {
      const filename = file["path"];
      const content = await this.getAsset(filename);
      this.saveAsset(filename, content);
    });

    await Promise.all(createFoldersMap);
    await Promise.all(downloadFiles);
  }

  async uploadAsset(filename, content) {
    const data = { key: filename, value: encode(content) };
    const options = this._createOptions("PUT", `/api/themes/${this.id}/assets`, data, {});

    const done = await this._putRequest(options, data);

    done ? console.log(filename, "uploaded!") : console.log("Could not upload:", filename);
  }

  async uploadAllAssets() {
    const { assets } = await this.getAllFilesInFolder();

    const uploadAll = assets.map(async (asset) => {
      const { path } = asset;
      // const file = await stat(`${this.path}${path}`);
      const content = await readFile(`${this.path}${path}`);
      await this.uploadAsset(path, content);
    });

    await Promise.all(uploadAll);
  }

  getAllFilesInFolder() {
  	console.log(this.path);  
  }

  watch() {
    const watchFunctions = {
      linux: () => this._linuxFolderWatch(this.path),
      default: () => console.log("Bruh")
    }

    const watchFunction = watchFunctions[process.platform];
    watchFunction();
  }

  _linuxFolderWatch(path) {
    const callback = (event, filename) => {
      console.log(callback.myPath);
    }

    const relationalPath = path.replace(this.path, "");
    callback.myPath = relationalPath;

    const self = this;
    watch(path, "utf-8", function(event, filename) { callback(event, filename) });
    readdir(path, function (err, files) {
      if (files) {
        files.forEach(file => {
          const pathToFile = `${path}/${file}`;
          if (!extname(pathToFile)) {
            self._linuxFolderWatch(pathToFile);
          }
        });
      }
    });
  }

  _defaultFolderWatch(path) {
    watch(path,
      {
        encoding: "utf-8",
        recursive: true
      },
      function (event, filename) {
        console.log(filename);
      });
  }

  _createOptions(method, pathApi, body, queries) {
    const queriesCopy = queries;

    Object.assign(queriesCopy, { gem_version: version })

    const path = `${pathApi}${this._createQueryString(queriesCopy)}`;

    const headers = {
      'Authorization': this.token
    }

    if (Object.keys(body).length > 0) {
      Object.assign(headers, { "Content-Type": "application/json", "Content-Length": JSON.stringify(body).length });
    }

    return {
      hostname: 'opencode.tray.com.br',
      port: 443,
      path,
      method,
      headers,
    }
  }

  _createQueryString(queries) {
    var queryArray = [];
    if (Object.keys(queries).length > 0) {
      queryArray.push("?");

      const queriesArray = Object.keys(queries);
      const lastQuery = queriesArray[queriesArray.length - 1];

      Object.keys(queries).forEach(query => {
        queryArray.push(`${query}=${queries[query]}`);

        if (queries[query] != queries[lastQuery]) {
          queryArray.push("&");
        }
      });
    }
    return queryArray.join("");
  }

  _putRequest(options, body) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        // console.log(`statusCode: ${res.statusCode}`);
      });
      req.end(JSON.stringify(body), () => {
        resolve(true);
      });
    });
  }

  _request(options, body) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);

        var data = [];

        res.on("data", d => {
          //console.log(d.toString("utf-8"));
          //console.log(options.method);
          data.push(d.toString("utf-8"));
        });
        res.on("end", () => {
          var str = data.join("");

          if (Object.keys(body).length > 0) {
            req.write(JSON.stringify(body));
          }

          resolve(JSON.parse(str))
        });
      });

      req.on("error", error => console.log(error));

      req.end();
    });
  }
}

module.exports = new NuTrayCore();
