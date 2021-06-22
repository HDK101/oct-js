const FWatcher = require("../Watch");
const { timeout, watchTimeout, testPath } = require("../Config/JestRuntime");
const { writeFile } = require("fs").promises;

const deleteFile = require("../Util/DeleteFile");

jest.setTimeout(timeout);

function delay(t, val) {
	return new Promise(function(resolve) {
		setTimeout(function() {
			resolve(val);
		}, t);
	});
}

class WatcherTest {
	constructor() {
		this.executed = {
			created: false,
			updated: false,
			deleted: false
		};
		this.onCreateTest = this.onCreateTest.bind(this);
		this.onUpdateTest = this.onUpdateTest.bind(this);
		this.onDeleteTest = this.onDeleteTest.bind(this);

	}

	async onCreateTest() {
		this.executed.created = true;
	}
	async onUpdateTest() {
		this.executed.updated= true;
	}
	async onDeleteTest() {
		this.executed.deleted = true;
	}
}

const watcherTest = new WatcherTest();
const watcher = new FWatcher(testPath, {
	onCreate: watcherTest.onCreateTest,
	onUpdate: watcherTest.onUpdateTest,
	onDelete: watcherTest.onDeleteTest
});
watcher.watch();

describe("Watch(create, update, delete)", () => {
	test("Watch create file", async() => {
		const data = new Uint8Array(Buffer.from("Test"));
		await delay(watchTimeout);
		await writeFile(testPath + "/file.txt", data);
		await delay(watchTimeout);
		expect(watcherTest.executed.created).toBe(true);
	});
	test("Watch update file", async() => {
		const data = new Uint8Array(Buffer.from("Testing"));
		await delay(watchTimeout);
		await writeFile(testPath + "/file.txt", data);
		await delay(watchTimeout);
		expect(watcherTest.executed.updated).toBe(true);
	});
	test("Watch delete file", async() => {
		await delay(watchTimeout);
		await deleteFile(testPath + "/file.txt");
		await delay(watchTimeout);
		expect(watcherTest.executed.deleted).toBe(true);
	});
});


