const mongoose = require ("mongoose");
const Schema = mongoose.Schema;

const MovieSchema = new Schema ({
	user_id: String,
	title: String,
	plot: String,
	date: Date,
	runtime: String,
	director: String,
	cast: String,
	rating: String,
	poster_url: String
});

module.exports = mongoose.model("Movie", MovieSchema);