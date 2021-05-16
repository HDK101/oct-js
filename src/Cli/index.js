#!/usr/bin/env node

const core = require("../App/NuTrayCore.js");
const { stat } = require("fs").promises;
const { resolve } = require("path");
const arguments = process.argv;

const mainArgument = arguments[2];

function uploadAll() {
	const path = process.cwd();
	const themeDataPath = resolve(path, "themeData.json");
	stat(themeDataPath).then(stat => console.log(stat)).catch(err => console.log(err));
	//core.set
}

const commands = {
	"uploadall": uploadAll
}

const selectedCommand = commands[mainArgument];
selectedCommand();
