#!/usr/bin/env node

const { Theme } = require("../Theme");
const { resolve } = require("path");

const fileExists = require("../Util/FileExists");

const CliIO = require("./CliIO");

const args = process.argv.slice(3) || [];

class Cli {
	constructor({ path, args }) {
		this.io = new CliIO({ path: process.cwd() });
		this.listThemes = this.listThemes.bind(this);
		this.download = this.download.bind(this);
		this.themeDelete = this.themeDelete.bind(this);
		this.themeNew = this.themeNew.bind(this);
		this.themeConfigure = this.themeConfigure.bind(this);
		this.remove = this.remove.bind(this);
		this.upload = this.upload.bind(this);
		this.watch = this.watch.bind(this);
		this.loadWatchScripts = this.loadWatchScripts.bind(this);
		this.path = path;
		this.args = args;
	}

	async loadWatchScripts() {
		const path = resolve(this.path, "oct.watch.js");
		if (await fileExists(path)) return require(path);
		return {};
	}

	async upload() {
		const theme = await this.io.createThemeFromData();
		if(!theme) return;
		const postArgument = args[0] || "";

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
			const { response, err } = await theme.uploadAsset(postArgument);
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
				if (err.code === "ENOENT") {
					console.error("Arquivo não encontrado.");
				}
			}
		}
	}

	async download() {
		const theme = await this.io.createThemeFromData();
		if(!theme) return;
		await theme.downloadAssets();
	}

	async watch() {
		const theme = await this.io.createThemeFromData();
		const relationalPath = args[0] || "";
		console.log("Assistindo pasta:", theme.path);
		if(!theme) return;
		theme.watch({ 
			watchScripts: await this.loadWatchScripts(),
			relationalPath
		});
	}

	async remove() {
		const theme = await this.io.createThemeFromData();
		if(!theme) return; 
		const fileArgument = args[0] || "";

		if (!fileArgument) {
			return console.error("Insira o caminho relativo para o arquivo como parâmetro");
		}

		const { err } = await theme.removeAsset(fileArgument) || {};
		if (!err) {
			return console.log(`${fileArgument} removido`);
		}
		else {
			console.error(`Não foi possível remover: ${fileArgument}`);
			console.error(err);
			return;
		}
	}

	async themeNew() {
		const key = this.args[0] || "";
		const password = this.args[1] || "";
		const name = this.args[2] || "";
		const hasArgument = key !== "" && password !== "" && name !== "";

		if(!hasArgument) { 
			return console.error("Insira uma chave e senha como parâmetros");
		} 

		const response = await Theme.create(key, password, name);
		const { data, code } = response;
		const series = Math.floor(code / 100);

		if (series != 2) {
			console.error("Não foi possível criar tema");
			console.error("Código da requisição:", code);
			return;
		}

		const { err } = await this.io.writeThemeJSON(key, password, data) || {};
		if (err) { 
			console.error("Não foi possível criar themeData.json");
			console.error(err);
		}
		else {
			console.log("themeData.json criado");
		}
	}

	async themeConfigure() {
		const key = args[0] || "";
		const password = args[1] || "";
		const id = args[2] || "";
		const hasArgument = key !== "" && password !== "";

		if(!hasArgument) { 
			console.error("Insira uma chave e senha como parâmetros");
			return;
		}	

		const { code, data } = await Theme.configure(key, password, id);
		const { err } = await this.io.writeThemeJSON(key, password, data) || {};

		if (err || code === 401) { 
			console.error("Não foi possível criar themeData.json");
			if (err) console.error(err);
		}
		else {
			console.log("themeData.json criado");
		}
	}

	async themeDelete() {
		const key = args[0] || "";
		const password = args[1] || "";
		const id = args[2] || "";
		const hasArgument = key !== "" && password !== "";

		if(!hasArgument) { 
			return console.error("Insira uma chave e senha como parâmetros");
		}	

		await Theme.delete(key, password, id);
		return console.log("Tema deletado");
	}

	async listThemes() {
		const keyArgument = this.args[0] || "";
		const passwordArgument = this.args[1] || "";

		const { err, themeData } = await this.io.getThemeFromData() || {};
		const { key: keyData, password: passwordData } = themeData || {};

		const key = keyArgument || keyData;
		const password = passwordArgument || passwordData;

		if (err || (keyArgument && !keyData && !passwordArgument && !passwordData)) { 
			return console.error("Insira um chave e senha como parâmetros ou tenha um themeData.json no diretório");
		}

		const { data } = await Theme.listAllThemes(key, password);
		const { themes } = data;

		themes.forEach(({ id, name, published }) => {
			const publishedText = published == 1 ? "Publicado" : "Não publicado";

			console.log(`\nNome: ${name}\nID: ${id}\n${publishedText}\n`);
		});
	}
}

module.exports = Cli;
