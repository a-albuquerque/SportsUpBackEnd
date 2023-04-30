'use strict';

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mongo-user:nGc7crCIbNMzOr25@maincluster.erymi.mongodb.net/sports_up_db', { useNewUrlParser: true, useUnifiedTopology: true});
module.exports = { mongoose }