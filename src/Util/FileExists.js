const { stat } = require("fs").promises;

async function fileExists(path) {
	try {
		await stat(path);
		return true;
	}
	catch {
		return false;
	}
}

module.exports = fileExists;
