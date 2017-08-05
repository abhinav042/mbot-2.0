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

//posting callbacks to the messenger-bot
app.post("/webhook", (req, res) => {
	console.log(JSON.stringify(req.body));
	if(req.body.object === "page") {

		//Iterate over each entry - there may be multiple if batched
		req.body.entry.forEach(entry => {
			const pageID = entry.id;
			const timeOfEvent = entry.time;
			entry.messaging.forEach(event => {
				if(event.message) {
					recievedMessage(event);
				} else {
					console.log("webhook recieved unkown ", event);
				}
			});
		});

		//sending back a 200
		res.sendStatus(200);
	}
});

//
function recievedMessage(event) {
	console.log("Message data: ", event.message);
};
