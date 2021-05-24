const { readdir, stat } = require("fs").promises;

class FWatcher {
	constructor(mainPath, { onCreate, onUpdate, onDelete }) {
		this.onCreate = onCreate;
		this.onUpdate = onUpdate;
		this.onDelete = onDelete;
		this.mainPath = mainPath;
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
	
	async getFoldersInside(path) {
		const allFiles = await readdir(path, { withFileTypes: true });
		return allFiles
			.filter((file) => file.isDirectory())
			.map((file) => file.name);
	}

	async handleWatchEvent() {
		const keys = Object.keys(this.watchFolders);
		await Promise.all(keys.map(async(key) => {
			const { sizes, folders, relationalPath } = this.watchFolders[key];
			const newSizes = await this.getFilesSizesInFolder(key);
			const newKeys = Object.keys(newSizes);
			await Promise.all(newKeys.map(async(newKey) => {
				//Update file
				if (typeof sizes[newKey] !== "undefined" && sizes[newKey] !== newSizes[newKey]) {
					console.log("Update: ", newKey);	
					await this.onUpdate(relationalPath + newKey);		
				}
				//Create file
				else if(typeof sizes[newKey] === "undefined") {
					console.log("Create: ", newKey);
					await this.onCreate(relationalPath + newKey);		
				}
				delete sizes[newKey];
			}));
			const remainingKeys = Object.keys(sizes);
			//Delete file
			await Promise.all(remainingKeys.map(async(remainingKey) => {
				console.log("Delete: ", remainingKey);
				await this.onDelete(relationalPath + remainingKey);
			}));
			
			const newFolders = await this.getFoldersInside(key);
			const createdFolders = newFolders.filter(n => !folders.includes(n));

			createdFolders.map(folder => {
				this.addFolderToWatch(`${key}/${folder}`);
			});
			
			this.watchFolders[key] = { sizes: newSizes, folders: newFolders, relationalPath };
		}));
	}

	async watch() {
		console.log("Started watching folder:", this.mainPath);
		this.addFolderToWatch(this.mainPath);
		setInterval(this.handleWatchEvent, 1000);
	}

	async addFolderToWatch(path) {
		const folders = await this.getFoldersInside(path);
		const sizes = await this.getFilesSizesInFolder(path);
		
		const relationalPath = path.replace(this.mainPath, "") + "/";
		this.watchFolders[path] = { sizes, folders, relationalPath };

		folders.forEach(folder => {
			this.addFolderToWatch(`${path}/${folder}`);
		});
	}
}

module.exports = FWatcher;
