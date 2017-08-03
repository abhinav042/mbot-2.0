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
	if(req.query["hub.verify_token"] === "my-token") {
		console.log("webhook verified");
		res.status(200).send(req.query["hub.challenge"]);
	} else {
		console.error("Verification failed. Tokens do not match");
		res.sendStatus(403);
	}
});