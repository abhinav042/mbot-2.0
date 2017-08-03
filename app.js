var express = require("express");
let request = require("request");
let bodyParser = require("body-parser");

let app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

//home
app.get("/", (req, res) => {
	res.send("working..🔥");
});

//facebook webhook verification
app.get("/webhook", (req, res) => {
	if(req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
		console.log("webhook verified");
		res.json(req.body);
		res.status(200).send(req.query["hub.challenge"]);
	} else {
		console.error("Verification failed. Tokens do not match");
		res.sendStatus(403);
	}
});
/*
app.post("/webhook", (req, res) => {
	if(req.query.object === "page") {

		//Iterate over each entry - there may be multiple if batched
		req.query.forEach(entry => {
			let pageID = entry.id;

		})
	}
})
*/