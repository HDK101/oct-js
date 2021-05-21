#!/usr/bin/env node

const OctCore = require("../App/NuTrayCore.js");
const { readFile } = require("fs").promises;
const { resolve } = require("path");
const argv = process.argv;

const mainArgument = argv[2];
const postArguments = argv.length > 3 ? argv.slice(3) : [];

async function createCoreFromData() {
	return new Promise(function (resolvePromise) {
		const path = process.cwd();
		const themeDataPath = resolve(path, "themeData.json");
		readFile(themeDataPath)
			.then((file) => JSON.parse(file))
			.then((json) => {
				const { id, key, password } = json;
				const core = new OctCore();
				core.setThemePath(path);
				core.setId(id);
				core.setToken(key, password);
				resolvePromise(core);
			})
			.catch((err) => console.log(err));
	});
}

async function upload() {
	const core = await createCoreFromData();
	const postArgument = postArguments.length > 0 ? postArguments[0] : "";

	if (postArgument === "") {
		await core.uploadAllAssets();
	} 
	else if(postArgument === "--c") {
		console.log("Deleting all files and uploading all");
	}
	else {
		await core.uploadAsset(postArgument);
	}
}

async function download() {
	const core = await createCoreFromData();
	await core.downloadAssets();
}

async function watch() {
	const core = await createCoreFromData();
	core.watch();
}

async function remove() {
	const core = await createCoreFromData();
	const fileArgument = postArguments.length > 0 ? postArguments[0] : "";
	const postArgument = postArguments.length > 0 ? postArguments[1] : "";

	await core.removeAsset(fileArgument);
	console.log(!(await core.hasAsset(fileArgument)));
} 

const commands = {
	upload: upload,
	download: download,
	watch: watch,
	remove: remove,
};

const selectedCommand = commands[mainArgument];
selectedCommand();
