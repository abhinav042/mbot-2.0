const express = require("express");
const request = require("request");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const db = mongoose.connect(process.env.MONGODB_URI);
const Movie = require("./models/movie");
const app = express();

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

//listening on heroku
app.listen((process.env.PORT || 5000));

//home
app.get("/", (req, res) => {
    res.send("it working 🔥..");
});

//facebook webhook verification
app.get("/webhook", (req, res) => {
    if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
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
    if (req.body.object === "page") {

        //Iterate over each entry - there may be multiple if batched
        req.body.entry.forEach(entry => {
            const pageID = entry.id;
            const timeOfEvent = entry.time;
            entry.messaging.forEach(event => {
                if (event.postback) {
                    recievedPostback(event);
                } else if (event.message) {
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
        //getUserProfile(senderID, recipientID);
        request({
            uri: "https://graph.facebook.com/v2.6/" + senderID,
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
                const name = JSON.parse(body).first_name;
                greeting = `Hi! ${name}.`;
            }
            const messageText = `${greeting} Ask me movie trivia. 🖕🏽 `;
            console.log(senderID);
            const messageData = {
                recipient: {
                    id: senderID
                },
                message: {
                    text: messageText
                }
            };
            callSendAPI(messageData);
        });
    } else if (event.postback.payload === "correct") {
        sendTextMessage(senderID, "works 🔥");
    } else if (event.postback.payload === "incorrect") {
        sendTextMessage(senderID, "enter another thang ⛔");
    }
};

//handling a message
function recievedMessage(event) {
    //console.log("Message data: ", event.message);
    if (!event.message.is_echo) {
        const senderID = event.sender.id;
        const recipientID = event.recipient.id;
        const timeOfMessage = event.timestamp;
        console.log(`Received message for user ${senderID} and page ${recipientID} at ${timeOfMessage} with message: ${JSON.stringify(event.message)}`);
        const messageID = event.message.mid;
        const messageText = event.message.text;
        const messageAttachements = event.message.attachements;

        if (messageText) {
            const formattedMsg = messageText.toLowerCase().trim();
            switch (formattedMsg) {
                case 'plot':
                case 'date':
                case 'runtime':
                case 'director':
                case 'cast':
                case 'rating':
                    getMovieDetails(senderID, formattedMsg);
                    break;
                case 'generic':
                    sendGenericMessage(senderID);
                    break;
                default:
                    findMovie(senderID, formattedMsg);
            }

        } else if (messageAttachements) {
            sendTextMessage(senderID, "attachments recieved");
        }
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
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN
        },
        method: "POST",
        json: messageData
    }, function(error, response, body) {
        if (!error) {
            console.log(body);
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

};

function findMovie(userID, movieTitle) {
    request(`https://theimdbapi.org/api/find/movie?title=${movieTitle}`, function(error, res, body) {
        console.log(body);
        if (!error && res.statusCode === 200) {
            const movieObj = JSON.parse(body);
            const query = {
                user_id: userID
            };
            const update = {
                user_id: userID,
                title: movieObj[0].title,
                plot: movieObj[0].storyline,
                date: movieObj[0].release_date,
                runtime: movieObj[0].length,
                director: movieObj[0].director,
                cast: movieObj[0].cast,
                rating: movieObj[0].rating,
                poster_url: movieObj[0].poster.large
            };
            console.log(`🔥 🔥 ${update.poster_url}`);
            const options = {
                upsert: true
            };
            Movie.findOneAndUpdate(query, update, options, (err, movie) => {
                if (err) {
                    console.log(`db error : ${err}`);
                } else {
                    const messageData = {
                        recipient: {
                            id: userID
                        },
                        message: {
                            attachment: {
                                type: "template",
                                payload: {
                                    template_type: "generic",
                                    elements: [{
                                        title: movieObj[0].title,
                                        subtitle: "was i correct?",
                                        image_url: movieObj[0].poster_url || "http://placehold.it/350x150",
                                        buttons: [{
                                            type: "postback",
                                            title: "yes 👍🏽",
                                            payload: "correct"
                                        }, {
                                            type: "postback",
                                            title: "no 👎🏽",
                                            payload: "incorrect"
                                        }]
                                    }]
                                }
                            }
                        }
                    }
                    callSendAPI(messageData);
                }
            });
        } else {
            sendTextMessage(userID, "Something went wrong. Try again.");
        }
    });
};