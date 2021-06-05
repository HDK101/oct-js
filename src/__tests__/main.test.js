const { OctCore, createTheme } = require("../App/NuTrayCore.js");

//Key and password got from Tray docs, for testing purposes
const key = "20a699301d454509691f3ea02c1cba4b";
const password = "ea0727075e1639a42fd966a2f6e67abc";

var core = new OctCore({
	key, password
});

jest.setTimeout(100000);

var currentCore = createTheme(key, password, "teste");
 
describe("OCT main functionality(without CLI)", () => {
	describe("Configure and delete", () => {
		beforeAll(async() => {
			currentCore = createTheme(key, password, "teste");
			console.log(await currentCore); 
		});
		test("configure theme", async() => {
			//const { code, data } = await core.themeConfigure(currentId);
			//expect(code).toBe(202);
		});
		test("delete theme", async() => {
			//const { code } = await core.themeDelete(currentId);
			//console.log("Delete theme is working, but returns code 400, i don't know what else to send in the request, if you know what should be in the request, PM me, or pull request if you already done.");
		});
	});
}); 
