class Requests {
	setAuthorizationToken(token) {
		this.token = token;
	}

	createOptions(method, pathApi, bodyAndQueries = {}) {
		const body = bodyAndQueries.body || {};
		const queriesCopy = bodyAndQueries.queries || {};

		Object.assign(queriesCopy, { gem_version: version });

		const path = `${pathApi}${this._createQueryString(queriesCopy)}`;

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
			const req = https.request(options); 
			req.end(JSON.stringify(body), () => {
				resolve(true);
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
}
