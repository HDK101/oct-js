const { version } = require("./Config/OpenCodeVersion");
const { resolve, dirname } = require("path");
const { writeFile, stat, mkdir, readFile, readdir, unlink, access } = require("fs").promises;
const { encode, decode } = require("./Base64");
const { constants } = require("fs");
const FWatcher = require("./Watch");
const Requests = require("./Requests");
const { safeParse } = require("../JSON");

class Theme {
	constructor(objectParams = {}) {
		const { key, password, id, themePath } = objectParams;
		this.requests = new Requests({
			token: `Token token=${key}_${password}`
		});
		this.requests.setOpenCodeVersion(version);
		this.requestFunctions = this.requests.getRelatedFunctions();
		this.bindAll();
		this.setToken(key, password);
		this.setId(id);
		this.setThemePath(themePath);
	}

	bindAll() {
		this.downloadAssets = this.downloadAssets.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.saveAsset = this.saveAsset.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.removeAssetServer = this.removeAssetServer.bind(this);
		this.deleteAssetLocally = this.deleteAssetLocally.bind(this);
		this.uploadAsset = this.uploadAsset.bind(this);
		this.uploadAllAssets = this.uploadAllAssets.bind(this);
		this.getAllFilesInFolder = this.getAllFilesInFolder.bind(this);
		this.getFilesInside = this.getFilesInside.bind(this);
		this.getFoldersInside = this.getFoldersInside.bind(this);
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

	static async create(key, password, name) {
		const requests = new Requests({
			token: `Token token=${key}_${password}`
		});
		const { request, createOptions } = requests.getRelatedFunctions();

		const theme = {
			theme_base: name,
			name,
			gem_version: version
		};
		const options = createOptions(
			"POST",
			"/api/themes",
			{ body: { theme } },
		);

		return await request(options, { theme });
	}

	static async configure(key, password, id) {
		const requests = new Requests({
			token: `Token token=${key}_${password}`
		});
		const { request, createOptions } = requests.getRelatedFunctions();		

		const options = createOptions(
			"POST",
			"/api/check",
			{ 
				queries: {
					theme_id: id
				}
			}
		);
		return await request(options, {});
	}

	static async listAllThemes(key, password) {
		const requests = new Requests({
			token: `Token token=${key}_${password}`
		});
		const { request, createOptions } = requests.getRelatedFunctions();

		const options = createOptions(
			"GET",
			"/api/list"
		);

		return await request(options, {});
	}

	static async delete(key, password, id) {
		const requests = new Requests({
			token: `Token token=${key}_${password}`
		});
		const { request, createOptions } = requests.getRelatedFunctions();

		const options = createOptions(
			"DELETE",
			`/api/themes/${id}`
		);

		return await request(options, {});
	}

	async getAssetsList() {
		const { request, createOptions } = this.requestFunctions;

		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = createOptions(
			"GET",
			`/api/themes/${this.id}/assets`
		);
		
		return await request(options, {});
	}

	async hasAsset(asset) {
		const { request, createOptions } = this.requestFunctions;

		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = createOptions(
			"GET",
			`/api/themes/${this.id}/assets`,
			{ queries: { key: asset } }
		);
		const { statusCode } = await request(options, {}, true);

		const statusCodeFirstNumber = Math.floor(statusCode / 100);

		//Check if status code is 2XX series
		return statusCodeFirstNumber == 2;
	}

	async getAsset(asset) {
		const { request, createOptions } = this.requestFunctions;

		if (typeof this.id === "undefined") {
			throw "Theme ID not set.";
		}

		const options = createOptions(
			"GET",
			`/api/themes/${this.id}/assets`,
			{ queries: { key: asset } }
		);
		const { data, code } = await request(options) || {};
		const { content } = data;
		if (content) {
			return decode(content);
		}
		return; 
	}

	async removeAsset(asset) {
		try {	
			const { err } = await this.deleteAssetLocally(asset) || {};
			if (err) return { err };
			await this.removeAssetServer(asset);
			return !(await this.hasAsset(asset));
			return {
				removed: !(await this.hasAsset(asset)),
			}
		}
		catch(err) {
			return {
				err
			}
		}
	}

	async removeAssetServer(asset) {
		const { request, createOptions } = this.requestFunctions;

		const options = createOptions(
			"DELETE",
			`/api/themes/${this.id}/assets`,
			{ queries: { key: asset } }
		);
		return await request(options, {});
	}

	async removeAllAssets() {
		const { data } = await this.getAssetsList();
		const { assets } = data; 

		const removeAllAssetsServer = () => {
			return Promise.all(assets.map(async({ path }) => {
				const { err } = await this.removeAssetServer(path) || {};
				if(err) console.log(`${path}: ${err}`);
			}));
		};
		
		await removeAllAssetsServer();
	}

	async deleteAssetLocally(asset) {
		const fullPath = `${this.path}${asset}`;
		try {
			const stats = await stat(fullPath);
			if (stats.isFile()) return await unlink(fullPath);
			else return { err: "Found a folder, not a asset" };
		}
		catch(err) {
			return { err };
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

			mkdir(`${this.path}/${folderString}`).catch((err) => {
				console.error(`${this.path}/${folderString} já existente`);
			});
		});

		const downloadFiles = files["assets"].map(async (file) => {
			const filename = file["path"];
			const content = await this.getAsset(filename);
			if (content) {
				this.saveAsset(filename, content);
				console.log(`${filename} baixado`);
			}
			else {
				return filename; 
			}
		});

		await Promise.all(createFoldersMap);
		const errorFiles = (await Promise.all(downloadFiles)).filter(file => typeof file !== "undefined");
		console.error("\nPorém não foi possível baixar esses arquivos:");
		errorFiles.forEach(file => console.error(file));
	}

	async uploadAsset(asset) {
	/*This functions expects the following model:
     * /folder/file.extension
     */

		try {
			const content = await readFile(`${this.path}${asset}`);
			const { putRequest, createOptions } = this.requestFunctions;

			const body = { key: asset, value: encode(content) };
			const options = createOptions(
				"PUT",
				`/api/themes/${this.id}/assets`,
				{ body }
			);
			const response = await putRequest(options, body);
			return { response, err: false, errMsg: "" }; 
		}
		catch(errMsg) {
			return { err: true, errMsg };
		}
	}

	async uploadAllAssets() {
		const files = await this.getAllFilesInFolder();
		//console.log(files);
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

		return entries
			.filter((file) => !file.isDirectory())
			.map((file) => ({ path: path + file.name }));
	}

	async getFoldersInside(path) {
		const entries = await readdir(path, { withFileTypes: true });

		return entries
			.filter((file) => file.isDirectory())
			.map((file) => ({ path: path + file.name }));
	}

	async getAllFilesInFolder() {
		const path = this.path + "/";
		const files = await this.getFiles(path);
		return files;
	}

	async getFiles(path = "./") {
		const files = await this.getFilesInside(path); 
		const folders = await this.getFoldersInside(path);

		for (const folder of folders)
			files.push(...(await this.getFiles(`${folder.path}/`)));

		return files;
	}

	async watch({ relationalPath, watchScripts }) {
		const watcher = new FWatcher(resolve(relationalPath, this.path), {
			onCreate: this.uploadAsset,
			onUpdate: this.uploadAsset,
			onDelete: this.removeAssetServer,
			watchScripts
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

module.exports = { Theme };
