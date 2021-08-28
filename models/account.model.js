const mongoose = require('mongoose');
const shortid = require('shortid')
const {Schema} = mongoose;

const accountSchema = new Schema({
    _id:{
        type: String,
        default: shortid.generate
    },
    username: {
        type: String,
        require: true,
    },
    email: {
        type: String,
        require: true,
    },
    password: {
        type: String,
        require: true,
    },
    gender:{
        type: String,
        default: "none"
    },
    age:{
        type: String,
        default: "2000"
    },
    currentToken: {
        type: String,
        default: shortid.generate
    }
})

const Account = mongoose.model('Account',accountSchema)

module.exports = Account;