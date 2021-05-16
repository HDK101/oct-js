#!/root/.nodejs/node-v14.17.0-linux-x64/bin/node

const core = require("../App/NuTrayCore.js");
const { stat } = require("fs").promises;
const { resolve } = require("path");
const arguments = process.argv;

const mainArgument = arguments[2];




function checkThemeData() {
	return new Promise(function (resolvePromise, reject) {
		const path = process.cwd();
		const themeDataPath = resolve(path, "themeData.json");
		stat(themeDataPath).then(stat => {
			core.setThemePath(path);
			console.log(path);
			core.setId(0);
			resolvePromise();
		}).catch(err => console.log(err));
	});
}


function uploadAll() {
	// checkThemeData().then(core.getAllFilesInFolder);
	core.setThemePath("test");
	core.getAllFilesInFolder();
	console.log(core.path);
}

const commands = {
	"uploadall": uploadAll
}

const selectedCommand = commands[mainArgument];
selectedCommand();
