'use strict';

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'contact me for collab!', { useNewUrlParser: true, useUnifiedTopology: true});
module.exports = { mongoose }
