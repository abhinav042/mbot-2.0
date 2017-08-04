const express = require("express");
const request = require("request");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//listening on heroku
app.listen((process.env.PORT || 5000));

//home
app.get("/", (req, res) => {
	res.send("it working 🔥..");
});

//facebook webhook verification
app.get("/webhook", (req, res) => {
	if(req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
		console.log("webhook verified");
		res.status(200).send(req.query["hub.challenge"]);
	} else {
		console.error("Verification failed. Tokens do not match");
		res.sendStatus(403);
	}
});

/*
app.post("/webhook", (req, res) => {
	console.log(JSON.stringify(req.body));
	if(req.body.object === "page") {

		//Iterate over each entry - there may be multiple if batched
		req.body.entry.forEach(entry => {
			let pageID = entry.id;
			let timeOfEvent = entry.time;
			entry.messaging.forEach(event => {

			})
		})
	}
})
*/