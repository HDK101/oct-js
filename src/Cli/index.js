#!/usr/bin/env node

const OctCore = require("../App/NuTrayCore.js");
const { readFile, writeFile } = require("fs").promises;
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
		await core.removeAllAssets();
		await core.uploadAllAssets();
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

	await core.removeAsset(fileArgument);
}

async function themeNew() {
	const core = new OctCore();
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const nameArgument = postArguments.length > 0 ? postArguments[2] : "";

	core.setToken(keyArgument, passwordArgument);
	const theme = await core.themeNew(nameArgument);
	await createThemeData(keyArgument, passwordArgument, theme);
}

async function themeConfigure() {
	const core = new OctCore();
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const idArgument = postArguments.length > 0 ? postArguments[2] : "";

	core.setToken(keyArgument, passwordArgument);
	await core.themeConfigure(keyArgument, passwordArgument, idArgument);
	// await createThemeData(keyArgument, passwordArgument, theme);
}

async function createThemeData(key, password, { theme_id, preview }) {
	const json = JSON.stringify({
		key,
		password,
		id: theme_id,
		preview
	});
	
	const data = new Uint8Array(Buffer.from(json));
	
	try {
		await writeFile("themeData.json", data);
	}
	catch(err) {
		console.error(err);
	}
}

const commands = {
	upload: upload,
	download: download,
	watch: watch,
	remove: remove,
	new: themeNew,
	configure: themeConfigure
};

const selectedCommand = commands[mainArgument];
selectedCommand();
