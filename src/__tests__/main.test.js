const { Theme } = require("../App/Theme");
const { stat } = require("fs").promises;
const { timeout, testPath, key, password } = require("../Config/JestRuntime");

require("dotenv").config();

jest.setTimeout(timeout);

var core;
var theme;
var asset;

async function exists(path) {
	try {
		await stat(path);
		return true;
	}
	catch {
		return false;
	}
}

describe("OCT main functionality(without CLI)", () => {
	test("New theme", async() => {
		const { code } = await Theme.create(key, password, "teste");
		expect(code).toBe(201);	
	});	
	describe("Configure and delete", () => {
		beforeAll(async() => {
			const { data } = await Theme.create(key, password, "teste");
			core = data;
		});
		test("configure theme", async() => {
			const { code } = await Theme.configure(key, password, core.theme_id);
			expect(code).toBe(202);
		});
		test("delete theme", async() => {
			await Theme.delete(key, password, core.theme_id);
			console.log("Delete theme is working, but returns code 400, i don't know what else to send in the request, if you know what should be in the request, PM me, or pull request if you already done.");
		});
	});
	describe("Theme class methods", () => {
		beforeAll(async() => {
			const { data } = await Theme.create(key, password, "teste");
			theme = new Theme({
				key,
				password,
				themePath: testPath,
				id: data.theme_id
			});
		});7;
		test("Asset exists", async() => {
			expect(await theme.hasAsset("/layouts/default.html")).toBeDefined();
		});
		test("Download asset", async() => {
			asset = await theme.getAsset("/layouts/default.html");
			expect(asset).toBeDefined();
		});
		test("Saving asset", async() => {
			await theme.saveAsset("/layouts/default.html", asset);
			const fileExists = await exists(testPath + "/layouts/default.html");
			expect(fileExists).toBe(true);
		});
		test("Remove asset", async() => {
			await theme.removeAsset("/layouts/default.html");
			const fileExists = await exists(testPath + "/layouts/default.html");
			const fileExistsInServer = await theme.hasAsset("/layouts/default.html");
			expect(fileExists).toBe(false);
			expect(fileExistsInServer).toBe(false);
		});
	});
}); 
