const https = require("https");
const { version } = require("./Config/OpenCodeVersion");
const { dirname } = require("path");
const { writeFile, stat, mkdir, readFile, readdir, unlink } = require("fs").promises;
const { encode, decode } = require("./Base64");
const { watch } = require("fs");

class NuTrayCore {
	constructor() {
		this.downloadAssets = this.downloadAssets.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.saveAsset = this.saveAsset.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.uploadAsset = this.uploadAsset.bind(this);
		this.uploadAllAssets = this.uploadAllAssets.bind(this);
		this.getAllFilesInFolder = this.getAllFilesInFolder.bind(this);
		this.getFiles = this.getFiles.bind(this);
		this.watch = this.watch.bind(this);
		this._linuxFolderWatch = this._linuxFolderWatch.bind(this);
	}

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

		const options = this._createOptions(
			"GET",
			`/api/themes/${this.id}/assets`,
			{},
			{}
		);

		return this._request(options, {});
	}

	async hasAsset(asset) {
		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = this._createOptions(
			"GET",
			`/api/themes/${this.id}/assets`,
			{},
			{ key: asset }
		);
		const { statusCode } = await this._request(options, {}, true);

		const statusCodeFirstNumber = Math.floor(statusCode / 100);

		//Check if status code is 2XX series
		return statusCodeFirstNumber == 2;
	}

	async getAsset(asset) {
		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = this._createOptions(
			"GET",
			`/api/themes/${this.id}/assets`,
			{},
			{ key: asset }
		);
		const file = await this._request(options, {});

		return decode(file["content"]);
	}

	async removeAsset(asset) {
		const options = this._createOptions(
			"DELETE",
			`/api/themes/${this.id}/assets`,
			{},
			{ key: asset }
		);
		try {	
			await this.deleteAssetLocally(`${this.path}${asset}`);
			await this._request(options, {});
		}
		catch(err) {
			console.error(err);
		}
	}

	async deleteAssetLocally(asset) {
		try {
			const stats = await stat(asset);
			if (stats.isFile()) return await unlink(asset);
			else throw "Found a folder, not a asset";
		}
		catch {
			throw "Locally asset not found";
		}
	}

	async saveAsset(asset, content) {
		/*This functions expects the following model:
     * /folder/file.extension
     */

		await writeFile(`${this.path}${asset}`, content, "utf-8");
		return console.log(`${asset}' saved!`);
	}

	async downloadAssets() {
		const files = await this.getAssetsList();

		var foldersArray = [];

		files["assets"].forEach((file) => {
			const filename = file["path"];
			const dir = dirname(filename).split("/");
			dir.shift();
			foldersArray.push(dir);
		});

		foldersArray.sort((a, b) => a.length - b.length);

		var folderStrings = [];
		foldersArray.forEach((folderString) => {
			folderStrings.push(folderString.join("/"));
		});

		var uniqueFolderStrings = [...new Set(folderStrings)];

		const createFoldersMap = uniqueFolderStrings.map(async (folderString) => {
			console.log(folderString);

			mkdir(`${this.path}/${folderString}`).catch((err) => {
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

	async uploadAsset(asset) {
		const content = await readFile(`${this.path}/${asset}`);

		const data = { key: asset, value: encode(content) };

		const options = this._createOptions(
			"PUT",
			`/api/themes/${this.id}/assets`,
			data,
			{}
		);

		const done = await this._putRequest(options, data);

		done
			? console.log(asset, "uploaded!")
			: console.log("Could not upload:", asset);
	}

	async uploadAllAssets() {
		const files = await this.getAllFilesInFolder();
		const self = this;
		const uploadAll = () => {
			return Promise.all(
				files.map(async (file) => {
					const { path } = file;
					const relativePath = path.replace(self.path, "");
					console.log(relativePath);
					await this.uploadAsset(relativePath);
				})
			);
		};
		await uploadAll();
	}

	async getAllFilesInFolder() {
		const path = this.path + "/";
		const files = await this.getFiles(path);
		return files;
	}

	async getFiles(path = "./") {
		const entries = await readdir(path, { withFileTypes: true });

		const files = entries
			.filter((file) => !file.isDirectory())
			.map((file) => ({ path: path + file.name }));

		const folders = entries.filter((folder) => folder.isDirectory());

		for (const folder of folders)
			files.push(...(await this.getFiles(`${path}${folder.name}/`)));

		return files;
	}

	async watch() {
		const watchFunctions = {
			linux: () => this._linuxFolderWatch(this.path),
			default: () => console.log("Bruh"),
		};

		const watchFunction = watchFunctions[process.platform];
		watchFunction();
	}

	async _linuxFolderWatch(path) {
		const callback = async(event, filename) => {
			await this.uploadAsset(`${callback.myPath}/${filename}`);
		};

		const relationalPath = path.replace(this.path, "");
		callback.myPath = relationalPath;

		const self = this;
		watch(path, "utf-8", callback);
		

		const allFiles = await readdir(path, { withFileTypes: true });
		const folders = allFiles
			.filter((file) => file.isDirectory())
			.map((file) => ({ path: path + "/" + file.name }));

		folders.forEach(({ path:ownPath }) => {
			self._linuxFolderWatch(ownPath);
		});
	}

	async _defaultFolderWatch(path) {
		watch(
			path,
			{
				encoding: "utf-8",
				recursive: true,
			},
			function (event, filename) {
				console.log(filename);
			}
		);
	}

	_createOptions(method, pathApi, body, queries) {
		const queriesCopy = queries;

		Object.assign(queriesCopy, { gem_version: version });

		const path = `${pathApi}${this._createQueryString(queriesCopy)}`;

		const headers = {
			Authorization: this.token,
		};

		if (Object.keys(body).length > 0) {
			Object.assign(headers, {
				"Content-Type": "application/json",
				"Content-Length": JSON.stringify(body).length,
			});
		}

		return {
			hostname: "opencode.tray.com.br",
			port: 443,
			path,
			method,
			headers,
		};
	}

	_createQueryString(queries) {
		var queryArray = [];
		if (Object.keys(queries).length > 0) {
			queryArray.push("?");

			const queriesArray = Object.keys(queries);
			const lastQuery = queriesArray[queriesArray.length - 1];

			Object.keys(queries).forEach((query) => {
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
			const req = https.request(options, (res) => {
				// console.log(`statusCode: ${res.statusCode}`);
			});
			req.end(JSON.stringify(body), () => {
				resolve(true);
			});
		});
	}

	_request(options, body, statusCodeOnly = false) {
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				console.log(`statusCode: ${res.statusCode}`);

				var data = [];

				res.on("data", (d) => {
					//console.log(d.toString("utf-8"));
					//console.log(options.method);
					data.push(d.toString("utf-8"));
				});
				res.on("end", () => {
					var str = data.join("");

					if (Object.keys(body).length > 0) {
						req.write(JSON.stringify(body));
					}

					!statusCodeOnly && resolve(JSON.parse(str));
					statusCodeOnly && resolve(res.statusCode);
				});
			});

			req.on("error", (error) => console.log(error));

			req.end();
		});
	}
}

module.exports = NuTrayCore;
