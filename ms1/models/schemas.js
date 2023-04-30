const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  fullname: String,
  username: String,
  md5_password_hash: String,
  firstName: String,
  lastName: String,
  date_of_birth: String,
  location: String,
  province: String,
  postalCode: String,
  university: String,
  description: String,
  gender: String,
  social_handles: {
    phone: String,
    email: String,
    facebook: String,
    twitter: String,
    instagram: String,
    pinterest: String,
    whatsapp: String,
  },
  attributes: [String],
  followed: [String],
  passed: [String],
  tournament_joined: [String],
  tournament_created: [String],
});

const TournamentSchema = new mongoose.Schema({
  tournament_name: String,
  date: String,
  description: String,
  organiser: String,
  location: String,
  participants: [String],
});

const User = mongoose.model("User", UserSchema);
const Tournament = mongoose.model("Tournament", TournamentSchema);

module.exports = { User, Tournament };
