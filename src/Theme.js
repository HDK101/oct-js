const { version } = require("../Config/OpenCodeVersion");

const { resolve, dirname } = require("path");
const { writeFile, stat, mkdir, readFile, readdir, unlink } = require("fs").promises;

const FWatcher = require("./Watch");
const Requests = require("./Requests");

const { encode, decode } = require("../Util/Base64");

class Theme {
	constructor(objectParams = {}, cliFunctions = {}) {
		const { key, password, id, themePath } = objectParams;
		const { onUpload, onRemove, onError, onDownloadsError, onDownload } = cliFunctions;

		this.requests = new Requests({
			token: `Token token=${key}_${password}`
		});
		this.requests.setOpenCodeVersion(version);
		this.requestFunctions = this.requests.getRelatedFunctions();
		this.onUpload = onUpload;
		this.onRemove = onRemove;
		this.onError = onError;
		this.onDownloadsError= onDownloadsError;
		this.onDownload = onDownload;
		this.bindAll();
		this.setId(id);
		this.setThemePath(themePath);
	}

	bindAll() {
		this.downloadAssets = this.downloadAssets.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.saveAsset = this.saveAsset.bind(this);
		this.removeAsset = this.removeAsset.bind(this);
		this.removeAssetServer = this.removeAssetServer.bind(this);
		this.remove = this.remove.bind(this);
		this.deleteAssetLocally = this.deleteAssetLocally.bind(this);
		this.uploadAsset = this.uploadAsset.bind(this);
		this.upload = this.upload.bind(this);
		this.uploadAllAssets = this.uploadAllAssets.bind(this);
		this.getAllFilesInFolder = this.getAllFilesInFolder.bind(this);
		this.getFilesInside = this.getFilesInside.bind(this);
		this.getFoldersInside = this.getFoldersInside.bind(this);
		this.getFiles = this.getFiles.bind(this);
		this.watch = this.watch.bind(this);
		this.getAsset = this.getAsset.bind(this);
	}

	setId(id) {
		this.id = id;
	}

	setThemePath(path) {
		this.path = path;
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

	async upload(asset) {
		const { err } = await this.uploadAsset("/" + asset);
		if (err) return this.onError(`Falha no envio:  ${asset}`);
		if (this.onUpload) this.onUpload(asset);
	}

	async remove(asset) {
		const { err } = await this.removeAssetServer("/" + asset);
		if (err) return this.onError(`Falha envio:  ${asset}`);
		if (this.onRemove) this.onRemove(asset);
	}

	async getAssetsList() {
		const { request, createOptions } = this.requestFunctions;

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
		const { data } = await request(options) || {};
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
		}
		catch(err) {
			return {
				err
			};
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
				if(err) this.onError(`${path}: ${err}`);
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
			this.onError(err);
			return false;
		} 
	}

	async downloadAssets() {
		const { code, data: files } = await this.getAssetsList();
		var foldersArray = [];

		if (code !== 200) return console.error("Não foi possível encontrar os arquivos do tema");

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

			mkdir(`${this.path}/${folderString}`).catch(() => {
				this.onError(`${this.path}/${folderString} já existe`);
			});
		});

		const downloadFiles = files["assets"].map(async (file) => {
			const filename = file["path"];
			const content = await this.getAsset(filename);
			if (content) {
				this.saveAsset(filename, content);
				if (this.onDownload) this.onDownload(filename);
			}
			else {
				return filename; 
			}
		});

		await Promise.all(createFoldersMap);
		const errorFiles = (await Promise.all(downloadFiles)).filter(file => typeof file !== "undefined");
		if (errorFiles.length) {
			this.onError("\nPorém não foi possível baixar esses arquivos:");
			this.onDownloadsError(errorFiles);
		}

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
			return { response, }; 
		}
		catch(err) {
			return { err };
		}
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
			onCreate: this.upload,
			onUpdate: this.upload,
			onDelete: this.remove,
			watchScripts
		});
		watcher.watch();
	}
}

module.exports = { Theme };
