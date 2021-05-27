const https = require("https");
const { version } = require("./Config/OpenCodeVersion");
const { dirname } = require("path");
const { writeFile, stat, mkdir, readFile, readdir, unlink, access } = require("fs").promises;
const { encode, decode } = require("./Base64");
const { constants } = require("fs");
const FWatcher = require("./Watch");
const Requests = require("./Requests");

class NuTrayCore {
	constructor() {
		this.requests = new Requests();
		this.bindAll();
	}

	bindAll() {
		this.requests = new Requests();
		this.downloadAssets = this.downloadAssets.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.saveAsset = this.saveAsset.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.removeAssetServer = this.removeAssetServer.bind(this);
		this.deleteAssetLocally = this.deleteAssetLocally.bind(this);
		this.uploadAsset = this.uploadAsset.bind(this);
		this.uploadAllAssets = this.uploadAllAssets.bind(this);
		this.getAllFilesInFolder = this.getAllFilesInFolder.bind(this);
		this.getFiles = this.getFiles.bind(this);
		this.themeNew = this.themeNew.bind(this);
		this.themeDelete = this.themeDelete.bind(this);
		this.watch = this.watch.bind(this);
	}

	setId(id) {
		this.id = id;
	}

	setThemePath(path) {
		this.path = path;
	}

	setToken(key, password) {
		this.requests.setAuthorizationToken(`Token token=${key}_${password}`);
	}

	async themeNew(name) {
		const theme = {
			theme_base: name,
			name,
			gem_version: version
		};
		const options = this._createOptions(
			"POST",
			"/api/themes",
			{ body: { theme } },
		);

		return await this._request(options, { theme });
	}

	async themeConfigure(id) {
		const options = this._createOptions(
			"POST",
			"/api/check",
			{ 
				queries: {
					theme_id: id
				}
			}
		);
		return await this._request(options, {});
	}

	async listAllThemes() {
		const options = this._createOptions(
			"GET",
			"/api/list"
		);

		return await this._request(options, {});
	}

	async themeDelete(id) {
		const options = this._createOptions(
			"DELETE",
			`/api/themes/${id}`
		);

		return await this._request(options, {});
	}

	async getAssetsList() {
		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = this._createOptions(
			"GET",
			`/api/themes/${this.id}/assets`
		);
		
		return await this._request(options, {});
	}

	async hasAsset(asset) {
		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = this._createOptions(
			"GET",
			`/api/themes/${this.id}/assets`,
			{ queries: { key: asset } }
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
			{ queries: { key: asset } }
		);
		const { data, code } = await this._request(options, {});
		return decode(data["content"]);
	}

	async removeAsset(asset) {
		try {	
			await this.deleteAssetLocally(asset);
			await this.removeAssetServer(asset);
			return !(await this.hasAsset(asset));
		}
		catch(err) {
			console.error(err);
		}
	}

	async removeAssetServer(asset) {
		const options = this._createOptions(
			"DELETE",
			`/api/themes/${this.id}/assets`,
			{ queries: { key: asset } }
		);
		return await this._request(options, {});
	}

	async removeAsset(asset) {
		try {	
			await this.deleteAssetLocally(asset);
			await this.removeAssetServer(asset);
			return !(await this.hasAsset(asset));
		}
		catch(err) {
			console.error(err);
		}
	}

	async removeAssetServer(asset) {
		const options = this._createOptions(
			"DELETE",
			`/api/themes/${this.id}/assets`
		);
		await this._request(options, {});
	}

	async removeAllAssets() {
		const { assets } = await this.getAssetsList();
		const self = this;

		const removeAllAssetsServer = () => {
			return Promise.all(assets.map(async({ path }) => {
				await self.removeAssetServer(path);
			}));
		};
		
		await removeAllAssetsServer();
	}

	async deleteAssetLocally(asset) {
		const fullPath = `${this.path}${asset}`;
		try {
			const stats = await stat(fullPath);
			if (stats.isFile()) return await unlink(fullPath);
			else throw "Found a folder, not a asset";
		}
		catch {
			console.error("Locally asset not found");
		}
	}

	async saveAsset(asset, content) {
	/*This functions expects the following model:
     * /folder/file.extension
     */
		try {
			await writeFile(`${this.path}${asset}`, content, "utf-8");
			return true;
		}
		catch(err) {
			return false;
		} 
	}

	async downloadAssets() {
		const { data: files } = await this.getAssetsList();
		var foldersArray = [];

		files.assets.forEach((file) => {
			const filename = file.path;
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
				console.error("Already exists!");
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
	/*This functions expects the following model:
     * /folder/file.extension
     */
		const content = await readFile(`${this.path}${asset}`);

		const body = { key: asset, value: encode(content) };

		const options = this._createOptions(
			"PUT",
			`/api/themes/${this.id}/assets`,
			{ body }
		);

		return await this._putRequest(options, data);
	}

	async uploadAllAssets() {
		const files = await this.getAllFilesInFolder();
		const uploadedFiles = {};
		await Promise.all(
			files.map(async (file) => {
				const { path } = file;
				const relativePath = path.replace(this.path, "");
				uploadedFiles[relativePath] = await this.uploadAsset(relativePath);
			})
		);
		return uploadedFiles;
	}

	async getFilesInside(path) {
		const entries = await readdir(path, { withFileTypes: true });

		return files = entries
			.filter((file) => !file.isDirectory())
			.map((file) => ({ path: path + file.name }));
	}

	async getFoldersInside(path) {
		const entries = await readdir(path, { withFileTypes: true });

		return files = entries
			.filter((file) => file.isDirectory())
			.map((file) => ({ path: path + file.name }));
	}

	async getAllFilesInFolder() {
		const path = this.path + "/";
		const files = await this.getFiles(path);
		return files;
	}

	async getFiles(path = "./") {
		const files = getFilesInside(path); 
		const folders = getFoldersInside(path); 

		for (const folder of folders)
			files.push(...(await this.getFiles(`${path}${folder.name}/`)));

		return files;
	}

	async watch() {
		const watcher = new FWatcher(this.path, {
			onCreate: this.uploadAsset,
			onUpdate: this.uploadAsset,
			onDelete: this.removeAssetServer,
		});
		watcher.watch();
	}

	async fileExists(path) {
		try {
			await access(`${this.path}${path}`, constants.R_OK);
		}
		catch {
			return false;
		}
		return true;
	}
}

module.exports = NuTrayCore;
