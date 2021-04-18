const { exception } = require("console");
const https = require("https");
const { version } = require("./Config/OpenCodeVersion");
const { resolve, dirname } = require("path");
const { promises } = require("dns");
const { writeFile, stat, mkdir } = require("fs").promises;


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
    const buff = Buffer.from(file["content"], "base64");

    return buff.toString();
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

  _createOptions(method, pathApi, body, queries) {
    const queriesCopy = queries;

    Object.assign(queriesCopy, { gem_version: version })

    const path = `${pathApi}${this._createQueryString(queriesCopy)}`;

    console.log(path);

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

  _request(options, body) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);

        var data = [];

        res.on("data", d => {
          data.push(d.toString("utf-8"));
        });
        res.on("end", () => {
          var str = data.join("");

          if (Object.keys(body).length > 0) {
            req.write(data);
          }

          resolve(JSON.parse(str))
        });
      });

      req.end();
    });
  }
}

module.exports = new NuTrayCore();
