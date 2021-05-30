const https = require("https");


class Requests {
	constructor() {
		this.setAuthorizationToken = this.setAuthorizationToken.bind(this);
		this.setOpenCodeVersion = this.setOpenCodeVersion.bind(this);
		this.createOptions = this.createOptions.bind(this);
		this.createQueryString = this.createQueryString.bind(this);
		this.putRequest = this.putRequest.bind(this);
		this.request = this.request.bind(this);
		this.getRelatedFunctions = this.getRelatedFunctions.bind(this);
	}

	setAuthorizationToken(token) {
		this.token = token;
	}

	setOpenCodeVersion(version) {
		this.version = version;
	}

	createOptions(method, pathApi, bodyAndQueries = {}) {
		const body = bodyAndQueries.body || {};
		const queriesCopy = bodyAndQueries.queries || {};

		Object.assign(queriesCopy, { gem_version: this.version });

		const path = `${pathApi}${this.createQueryString(queriesCopy)}`;

		const headers = {
			Authorization: this.token,
		};

		if (Object.keys(body).length > 0) {
			Object.assign(headers, {
				"Content-Type": "application/json",
				"Content-Length": JSON.stringify(body).length,
			});
		}

		return {
			hostname: "opencode.tray.com.br",
			port: 443,
			path,
			method,
			headers,
		};
	}

	createQueryString(queries) {
		var queryArray = [];
		if (Object.keys(queries).length > 0) {
			queryArray.push("?");

			const queriesArray = Object.keys(queries);
			const lastQuery = queriesArray[queriesArray.length - 1];

			Object.keys(queries).forEach((query) => {
				queryArray.push(`${query}=${queries[query]}`);

				if (queries[query] != queries[lastQuery]) {
					queryArray.push("&");
				}
			});
		}
		return queryArray.join("");
	}

	putRequest(options, body) {
		return new Promise((resolve, reject) => {
			var data = [];
			var str = "";
			const req = https.request(options, res => {
				res.on("data", (d) => {
					data.push(d.toString("utf-8"));
				});
				res.on("end", () => {
					resolve({ 
						data: JSON.parse(data.join("")),
						code: res.statusCode
					});
				});
			}); 

			req.end(JSON.stringify(body), () => {
			});
		});
	}

	request(options, body, statusCodeOnly = false) {
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				var data = [];
				res.on("data", (d) => {
					data.push(d.toString("utf-8"));
				});
				res.on("end", () => {
					var str = data.join("");
					!statusCodeOnly && resolve(
						{
							data: JSON.parse(str),
							code: res.statusCode
						}
					);
					statusCodeOnly && resolve(res.statusCode);
				});
			});

			if (Object.keys(body).length > 0) {
				req.write(JSON.stringify(body));
			}

			req.on("error", (error) => console.log(error));

			req.end();
		});
	}

	getRelatedFunctions() {
		return {
			request: this.request,
			putRequest: this.putRequest,
			createQueryString: this.createQueryString,
			createOptions: this.createOptions,
		}
	}
}

module.exports = Requests;
