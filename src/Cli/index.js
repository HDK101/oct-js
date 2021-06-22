#!/usr/bin/env node

const Cli = require("./Cli");

const argv = process.argv;
const mainArgument = argv[2];
const args = argv.length > 3 ? argv.slice(3) : [];

const cli = new Cli({ path: process.cwd(), args });

const commands = {
	upload: cli.upload,
	download: cli.download,
	watch: cli.watch,
	remove: cli.remove,
	new: cli.themeNew,
	delete: cli.themeDelete,
	configure: cli.themeConfigure,
	list: cli.listThemes,
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
};

const selectedCommand = commands[mainArgument];
if (selectedCommand) selectedCommand();
else {
	console.log("COMANDOS:");
	const helpKeys = Object.keys(helpCommands);
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

