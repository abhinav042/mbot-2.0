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
				if(event.postback) {
					recievedPostback(event);
				}
				else if(event.message) {
					recievedMessage(event);
				} else {
					console.log("webhook recieved unknown ", event);
				}
			});
		});

		//sending back a 200
		res.sendStatus(200);
	}
});

//handling a postback
function recievedPostback(event) {
	//console.log("Message data: ", event.message);	
	const senderID = event.sender.id;
	const recipientID = event.recipient.id;
	const timeOfMessage = event.timestamp;
	if (event.postback.payload === "Greeting") {
		//get user's first name from USER API
		getUserProfile(senderID, recipientID);
	}
};

//handling a message
function recievedMessage(event) {
	//console.log("Message data: ", event.message);
	const senderID = event.sender.id;
	const recipientID = event.recipient.id;
	const timeOfMessage = event.timestamp;
	console.log(`Received message for user ${senderID} and page ${recipientID} at ${timeOfMessage} with message: ${JSON.stringify(event.message)}`);
	const messageID = event.message.mid;
	const messageText = event.message.text;
	const messageAttachements = event.message.attachements;

	if(messageText) {

		switch(messageText) {
			case 'generic':
				sendGenericMessage(senderID);
			break;
			default:
				sendTextMessage(senderID, messageText);
		}
		
	} else if (messageAttachements) {
		sendTextMessage(senderID, "attachments recieved");
	}
};

function sendTextMessage(recipientID, messageText) {
	const messageData = {
		recipient: {
			id: recipientID
		},
		message: {
			text: messageText
		}
	};

	callSendAPI(messageData);
};

function callSendAPI(messageData) {
	request({
		uri: "https://graph.facebook.com/v2.6/me/messages",
		qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
		method: "POST",
		json: messageData
	}, function(error, response, body) {
		if(!error) {
			const recipientID = body.recipient_id;
			const messageID = body.message_id;
			console.log(`Successfully sent a message with id ${messageID} to recipient ${recipientID}`);
		} else {
			console.error("unable to send message");
			console.error(response);
			console.error(error);
		}
	});
};

function getUserProfile(senderID, recipientID) {
    request({
        uri: `https://graph.facebook.com/v2.6/${senderID}`,
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN,
            fields: "first_name"
        },
        method: "GET",
    }, function(error, response, body) {
        let greeting = "";
        if (error) {
            console.log(`Error getting user's name ${error}`);
        } else {
            name = JSON.parse(body).first_name;
            greeting = `Hi! ${name}.`;
        }
        const messageText = `${greeting} Ask me movie trivia. 🖕🏽 `;

        const messageData = {
			recipient: {
				id: recipientID
			},
			message: {
				text: messageText
			}
		};
		callSendAPI(messageData);
    });
};






