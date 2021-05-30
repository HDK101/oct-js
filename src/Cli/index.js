#!/usr/bin/env node

const OctCore = require("../App/NuTrayCore.js");
const { readFile, writeFile } = require("fs").promises;
const { resolve } = require("path");
const argv = process.argv;

const mainArgument = argv[2];
const postArguments = argv.length > 3 ? argv.slice(3) : [];

async function createCoreFromData() {
	const path = process.cwd();
	const themeDataContent = await readFile(resolve(path, "themeData.json"), "utf-8");
	const themeData = JSON.parse(themeDataContent);
	const { id, key, password } = themeData;
	return new OctCore({
		key,
		password,
		id,
		themePath: path
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
		const { code } = await core.uploadAsset(postArgument);
		if(code === 201) {
			console.log(postArgument, "enviado");
		}	
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
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const nameArgument = postArguments.length > 0 ? postArguments[2] : "";

	const core = new OctCore({
		key: keyArgument,
		password:  passwordArgument
	});

	const response = await core.themeNew(nameArgument);
	const { data: theme } = response;
	await createThemeData(keyArgument, passwordArgument, theme);
}

async function themeConfigure() {
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const idArgument = postArguments.length > 0 ? postArguments[2] : "";

	const core = new OctCore({
		key: keyArgument,
		password: passwordArgument,
	});

	const { data: theme } = await core.themeConfigure(idArgument);
	await createThemeData(keyArgument, passwordArgument, theme);
}

async function themeDelete() {
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const idArgument = postArguments.length > 0 ? postArguments[2] : "";

	const core = new OctCore({
		key: keyArgument,
		password: passwordArgument
	});

	core.setToken(keyArgument, passwordArgument);
	await core.themeDelete(idArgument);
}

async function listThemes() {
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";
	const hasArgument = keyArgument !== "" && passwordArgument !== ""
	
	const core = hasArgument ? new OctCore({
		key: keyArgument,
		password: passwordArgument
	}) : await createCoreFromData();

	const { data } = await core.listAllThemes();
	const { themes } = data;

	console.log(data);

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

const helpCommands = {
	upload: [
		"ARQUIVO  #Manda o arquivo pro servidor",
		"--c  #Deleta todos os arquivos do tema no servidor e faz upload dos que estão na pasta "
	],
	download: "#Faz download de todos os arquivos do tema",
	watch: "#Assiste a pasta do tema e manda para o servidos as mudanças feitas",
 	remove: "ARQUIVO #Deleta o arquivo tanto localmente quanto no servidor",
	new: "CHAVE(KEY) SENHA(PASSWORD) NOME_DO_TEMA #Cria um novo tema",
	delete: "CHAVE(KEY) SENHA(PASSWORD) ID_DO_TEMA  #Deleta um tema",
	configure: "CHAVE(KEY) SENHA(PASSWORD) ID_DO_TEMA  #Baixa a configuração do tema",
	list: [
		"CHAVE(KEY) SENHA(PASSWORD) #Lista todos os temas",
		"#Lista todos os temas usando a chave e a senha da configuração localizada na pasta",
	]
}

const selectedCommand = commands[mainArgument];
if (selectedCommand) selectedCommand();
else {
	console.log("COMANDOS:");
	helpKeys = Object.keys(helpCommands);
	helpKeys.forEach(help => {
		if (Array.isArray(helpCommands[help])) {
			console.log(`  oct ${help}:`);
			helpCommands[help].forEach(text => {
				console.log("    oct", help, text);
			});
		}
		else {
			console.log(`  oct ${help} ${helpCommands[help]}`);
		}
	});
}
