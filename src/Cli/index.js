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
	const response = await core.themeNew(nameArgument);
	const { data: theme } = response;
	await createThemeData(keyArgument, passwordArgument, theme);
}

async function themeConfigure() {
	const core = new OctCore();
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const idArgument = postArguments.length > 0 ? postArguments[2] : "";

	core.setToken(keyArgument, passwordArgument);
	const { data: theme } = await core.themeConfigure(idArgument);
	await createThemeData(keyArgument, passwordArgument, theme);
}

async function themeDelete() {
	const core = new OctCore();
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const idArgument = postArguments.length > 0 ? postArguments[2] : "";

	core.setToken(keyArgument, passwordArgument);
	await core.themeDelete(idArgument);
}

async function listThemes() {
	let core;
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";

	if (keyArgument === "" || passwordArgument === "") {
		core = await createCoreFromData();
	}
	else {
		core = new OctCore();
		core.setToken(keyArgument, passwordArgument);
	}
	
	const { data } = await core.listAllThemes();
	const { themes } = data;

	themes.forEach(({ id, name, published }) => {
		const publishedText = published === 1 ? "Publicado" : "Não publicado";
		console.log(`\nNome: ${name}\nID: ${id}\n${publishedText}\n`);
	});
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
	delete: themeDelete,
	configure: themeConfigure,
	list: listThemes,
};

const selectedCommand = commands[mainArgument];
selectedCommand();
