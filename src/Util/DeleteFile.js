const { unlink } = require("fs").promises;

async function deleteFile(filePath) {
	try {
		await unlink(filePath);
		return true;
	}
	catch {
		return false;
	}
}

module.exports = deleteFile;
