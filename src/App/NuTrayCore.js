const { exception } = require("console");
const https = require("https");
const { version } = require("./Config/OpenCodeVersion");
const { resolve } = require("path");
const { writeFile } = require("fs").promises;


class NuTrayCore {
  constructor() {
    this.setId(11);
    // this.getAssetsList();
    this.setThemePath(resolve(__dirname, "..", "..", "theme"));
    this.getAsset("/elements/footer.html").then(file => {
      this.saveAsset("/elements/footer.html", file);
    });
  }

  setId(id) {
    this.id = id;
  }

  setThemePath(path) {
    this.path = path;
  }

  getAssetsList() {
    if (typeof this.id === "undefined") {
      throw "Theme ID not set.";
    }

    const options = this._createOptions("GET", `/api/themes/${this.id}/assets`, {}, {});

    this._request(options, {});
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

  _createOptions(method, pathApi, body, queries) {
    const queriesCopy = queries;

    Object.assign(queriesCopy, { gem_version: version })

    const path = `${pathApi}${this._createQueryString(queriesCopy)}`;

    console.log(path);

    const headers = {
      'Authorization': "Token"
    }

    if (Object.keys(body).length > 0) {
      Object.assign(headers, { "Content-Type": "application/json", "Content-Length": JSON.stringify(body).length });
    }

    return {
      hostname: 'opencode.tray.com.br',
      port: 443,
      path: path,
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
