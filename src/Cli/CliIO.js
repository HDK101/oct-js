const { readFile, writeFile } = require("fs").promises;
const { resolve } = require("path");

const safeParse = require("../Util/JSONSafeParse");
const fileExists = require("../Util/FileExists");

const { Theme } = require("../Theme");

class CliIO {
	constructor({ path }) {
		this.path = path;
		this.getThemeFromData = this.getThemeFromData.bind(this);
		this.createThemeFromData = this.createThemeFromData.bind(this);
	}

	async getThemeFromData() {
		if (await fileExists(resolve(this.path, "themeData.json"))) {
			const themeDataContent = await readFile(resolve(this.path, "themeData.json"), "utf-8");
			return { themeData: safeParse(themeDataContent) };
		}
		else {
			return { err: "themeData.json não encontrado" };
		}
	}

	async createThemeFromData() {
		const path = process.cwd();
		const { err, themeData } = await this.getThemeFromData();
		if (err) return console.error(err);
		const { id, key, password } = themeData;
		return new Theme({
			key,
			password,
			id,
			themePath: path
		},
		{
			onUpload: (file) => console.log(file, "enviado"),
			onRemove: (file) => console.log(file, "removido"),
			onDownload: (file) => console.log(file, "baixado"),
			onError: (err) => console.error(err),
			onDownloadsError: (files) => {
				files.forEach(file => console.error(file));
			},
		});
	}

	async writeThemeJSON(key, password, { theme_id, preview }) {
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
}

module.exports = CliIO;
