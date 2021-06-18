#!/usr/bin/env node

const { Theme } = require("../App/NuTrayCore.js");
const { readFile, writeFile, stat } = require("fs").promises;
const { resolve } = require("path");
const argv = process.argv;

const mainArgument = argv[2];
const postArguments = argv.length > 3 ? argv.slice(3) : [];

async function fileExists(path) {
	try {
		await stat(path);
		return true;
	}
	catch {
		return false;
	}
}

async function getCredentialsFromData() {
	const path = process.cwd();
	const themeDataContent = await readFile(resolve(path, "themeData.json"), "utf-8");
	const themeData = JSON.parse(themeDataContent);
	return themeData;
}

async function createThemeFromData() {
	const path = process.cwd();
	if (!(await fileExists(resolve(path, "themeData.json")))) {
		console.error("themeData.json não encontrado");
		return;
	}
	const themeDataContent = await readFile(resolve(path, "themeData.json"), "utf-8");
	const themeData = JSON.parse(themeDataContent);
	const { id, key, password } = themeData;
	return new Theme({
		key,
		password,
		id,
		themePath: path
	},
	{
		onUpload: (file) => console.log(file, "enviado"),
		onDownload: (file) => console.log(file, "baixado"),
		onError: (err) => console.error(err),
		onDownloadsError: (files) => {
			files.forEach(file => console.error(file));
		},
	}
	);
}

async function loadWatchScripts() {
	const path = process.cwd();
	return require(resolve(path, "oct.watch.js"));
}

async function upload() {
	const theme = await createThemeFromData();
	if(!theme) return;
	const postArgument = postArguments.length > 0 ? postArguments[0] : "";

	if (!postArgument) {
		console.error("Insira o caminho relativo para o arquivo como parâmetro");
		return;
	}

	if (postArgument === "") {
		await theme.uploadAllAssets();
		console.log("Todos os assets locais enviados para o tema");
	} 
	else if(postArgument === "--c") {
		await theme.removeAllAssets();
		console.log("Todos os assets do tema removidos");
		await theme.uploadAllAssets();
		console.log("Todos os assets locais enviados para o tema");
	}
	else {
		const { response, err, ...rest } = await theme.uploadAsset(postArgument);
		if (!err) {
				const { code } = response;
				const series = Math.floor(code / 100);
				if(series === 2) {
					console.log(postArgument, "enviado");
				}
				else if(series === 4 || series === 5) {
					console.error("Erro ao enviar o arquivo pro servidor");
					console.error("Código da resposta:", code);
				}	
		}
		else {
			if (rest.errMsg.code === "ENOENT") {
				console.error("Arquivo não encontrado.");
			}
		}
	}
}

async function download() {
	const theme = await createThemeFromData();
	if(!theme) return;
	await theme.downloadAssets(function(filename) {
		console.log(filename, "baixado");
	});
}

async function watch() {
	const theme = await createThemeFromData();
	const relationalPath = postArguments.length > 0 ? postArguments[0] : "";
	if(!theme) return;
	theme.watch({ 
		watchScripts: await loadWatchScripts(),
		relationalPath
	});
}

async function remove() {
	const theme = await createThemeFromData();
	if(!theme) return; 
	const fileArgument = postArguments.length > 0 ? postArguments[0] : "";

	if (!fileArgument) {
		console.error("Insira o caminho relativo para o arquivo como parâmetro");
		return;
	}

	const { err } = await theme.removeAsset(fileArgument) || {};
	if (!err) {
		console.log(`${fileArgument} removido`);
	}
	else {
		console.error(`Não foi possível remover: ${fileArgument}`);
		console.error(err);
	}
}

async function themeNew() {
	const key = postArguments.length > 0 ? postArguments[0] : "";
	const password = postArguments.length > 0 ? postArguments[1] : "";
	const name = postArguments.length > 0 ? postArguments[2] : "";
	const hasArgument = key !== "" && password !== "";

	if(!hasArgument) { 
		console.error("Insira uma chave e senha como parâmetros");
		return;
	} 

	const response = await Theme.create(key, password, name);
	const { data, code } = response;
	const series = Math.floor(code / 100);

	if (series != 2) {
		console.error("Não foi possível criar tema");
		console.error("Código da requisição:", code);
		return;
	}

	const { err } = await writeThemeJSON(key, password, data) || {};
	if (err) { 
		console.error("Não foi possível criar themeData.json");
		console.error(err);
	}
	else {
		console.log("themeData.json criado");
	}
}

async function themeConfigure() {
	const key = postArguments.length > 0 ? postArguments[0] : "";
	const password = postArguments.length > 0 ? postArguments[1] : "";
	const id = postArguments.length > 0 ? postArguments[2] : "";
	const hasArgument = key !== "" && password !== "";

	if(!hasArgument) { 
		console.error("Insira uma chave e senha como parâmetros");
		return;
	}	

	const { code, data } = await Theme.configure(key, password, id);
	const { err } = await writeThemeJSON(key, password, data) || {};

	if (err || code === 401) { 
		console.error("Não foi possível criar themeData.json");
		if (err) console.error(err);
	}
	else {
		console.log("themeData.json criado");
	}
}

async function themeDelete() {
	const key = postArguments.length > 0 ? postArguments[0] : "";
	const password = postArguments.length > 0 ? postArguments[1] : "";
	const id = postArguments.length > 0 ? postArguments[2] : "";
	const hasArgument = key !== "" && password !== "";

	if(!hasArgument) { 
		console.error("Insira uma chave e senha como parâmetros");
		return;
	}	

	await Theme.delete(key, password, id);
	console.log("Tema deletado");
}

async function listThemes() {
	const keyArgument = postArguments.length > 0 ? postArguments[0] : "";
	const passwordArgument = postArguments.length > 0 ? postArguments[1] : "";

	const { key: keyData, password: passwordData } = getCredentialsFromData();

	const key = keyArgument || keyData;
	const password = passwordArgument || passwordData;

	if (!keyArgument && !keyData && !passwordArgument && !passwordData) { 
		console.error("Insira um chave e senha como parâmetros ou tenha um themeData.json no diretório");
		return;
	}

	const { data } = await Theme.listAllThemes(key, password);
	const { themes } = data;

	themes.forEach(({ id, name, published }) => {
		const publishedText = published === 1 ? "Publicado" : "Não publicado";
		console.log(`\nNome: ${name}\nID: ${id}\n${publishedText}\n`);
	});
}

async function writeThemeJSON(key, password, { theme_id, preview }) {
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
		return { err };
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
