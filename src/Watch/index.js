const { readFile, readdir, stat } = require("fs").promises;
const { extname, resolve } = require("path");
const crypto = require("crypto");

class FWatcher {
	constructor(mainPath, { onCreate, onUpdate, onDelete, watchScripts }) {
		this.onCreate = onCreate;
		this.onUpdate = onUpdate;
		this.onDelete = onDelete;
		this.mainPath = mainPath;
		this.watchScripts = watchScripts || [];
		this.watchFolders = {};
		this.watch = this.watch.bind(this);
		this.handleWatchEvent = this.handleWatchEvent.bind(this);
		this.getFoldersInside = this.getFoldersInside.bind(this);
		this.addFolderToWatch = this.addFolderToWatch.bind(this);
		this.getFilesSizesInFolder = this.getFilesSizesInFolder.bind(this);
	}

	async getFilesSizesInFolder(path) {
		const allFiles = await readdir(path, { withFileTypes: true });
		const files = allFiles
			.filter((file) => !file.isDirectory())
			.map((file) => file.name);
		const sizes = {};
		await Promise.all(files.map(async(file) => {
			const fullPath = `${path}/${file}`;
			const { size } = await stat(fullPath);
			sizes[file] = size;
		}));

		return sizes;
	}

	async getFilesHashesInFolder(path) {
		const allFiles = await readdir(path, { withFileTypes: true });
		const files = allFiles
			.filter((file) => !file.isDirectory())
			.map((file) => file.name);
		const hashes = {};
		await Promise.all(files.map(async(file) => {
			const fullPath = `${path}/${file}`;
			const hash = await this.checkFileHash(fullPath);
			hashes[file] = hash;
		}));

		return hashes;
	}
	
	async getFoldersInside(path) {
		const allFiles = await readdir(path, { withFileTypes: true });
		return allFiles
			.filter((file) => file.isDirectory())
			.map((file) => file.name);
	}

	handleFile(path, key, sizes, newSizes, hashes, newHashes) {
		const equalHashes = hashes[key] === newHashes[key];

		const updateDifferentSizes = typeof sizes[key] !== "undefined" && sizes[key] !== newSizes[key];
		const updateDifferentContent = typeof sizes[key] !== "undefined" && sizes[key] === newSizes[key] && !equalHashes;
		const createFile = typeof sizes[key] === "undefined";

		const relativePath = path.replace(this.mainPath, "");
		if (this.watchScripts.length > 0 && (updateDifferentSizes || updateDifferentContent || createFile)) {
			this.watchScripts.map(script => {
				if (script.ext.test(extname(key))) {
					if (script.folder === relativePath && script.preCallback) {
						script.preCallback(key, path, this.mainPath);
					}
				}
			});
		}

		if (updateDifferentSizes) {
			this.onUpdate(resolve(relativePath, key));
		}
		else if (updateDifferentContent) {
			this.onUpdate(resolve(relativePath, key));
		}
		else if(createFile) {
			this.onCreate(resolve(relativePath, key));
		}
	
		if (this.watchScripts.length > 0 && (updateDifferentSizes || updateDifferentContent || createFile)) {
			this.watchScripts.forEach(script => {
				if (script.ext.test(extname(key))) {
					const relativePath = path.replace(this.mainPath, "");
					if (script.folder === relativePath && typeof script.postCallback !== "undefined") {
						script.postCallback(key, path, this.mainPath);
					}
				}
			});
		}
	}

	async handleWatchEvent() {
		const keys = Object.keys(this.watchFolders);
		await Promise.all(keys.map(async(key) => {
			const { sizes, hashes, folders, relationalPath } = this.watchFolders[key];
			const newSizes = await this.getFilesSizesInFolder(key);
			const newKeys = Object.keys(newSizes);
			const newHashes = await this.getFilesHashesInFolder(key);
			await Promise.all(newKeys.map(async(newKey) => {
				this.handleFile(key, newKey, sizes, newSizes, hashes, newHashes);
				delete sizes[newKey];
			}));
			const remainingKeys = Object.keys(sizes);
			//Delete file
			await Promise.all(remainingKeys.map(async(remainingKey) => {
				await this.onDelete(resolve(relationalPath, remainingKey));
			}));
			
			const newFolders = await this.getFoldersInside(key);
			const createdFolders = newFolders.filter(n => !folders.includes(n));

			createdFolders.map(folder => {
				this.addFolderToWatch(`${key}/${folder}`);
			});
			this.watchFolders[key] = { sizes: newSizes, hashes:newHashes, folders: newFolders, relationalPath };
		}));
	}

	async watch() {
		this.addFolderToWatch(this.mainPath);
		setInterval(this.handleWatchEvent, 1000);
	}

	async addFolderToWatch(path) {
		const folders = await this.getFoldersInside(path);
		const sizes = await this.getFilesSizesInFolder(path);
		const hashes = await this.getFilesHashesInFolder(path);
		
		const relationalPath = path.replace(this.mainPath, "") + "/";
		this.watchFolders[path] = { sizes, hashes, folders, relationalPath };

		folders.forEach(folder => {
			this.addFolderToWatch(`${path}/${folder}`);
		});
	}

	async checkFileHash(filePath) {
		const content = await readFile(filePath, "utf-8");
		return crypto.createHash("md5").update(content).digest("hex");
	}
}

module.exports = FWatcher;
