const safeParse = (content) => {
	try {
		return JSON.parse(content);
	}
	catch {
		return {};
	}
} 

module.exports = { safeParse };
