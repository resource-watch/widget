const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const uuidV4 = require('uuid/v4');
const Schema = mongoose.Schema;

const Widget = new Schema({
    _id:                { type: String, default: uuidV4 },
    dataset:            { type: String, required: true,  trim: true },
    name:               { type: String, required: true,  trim: true },
    slug:               { type: String, required: true,  trim: true, unique: true },
    description:        { type: String, required: false, trim: true },
    source:          	{ type: String, required: false, trim: true },
    sourceUrl:   	{ type: String, required: false, trim: true },
    application:      [ { type: String, required: true,  trim: true } ],
    verified:		{ type: Boolean, default: false  },
    default:		{ type: Boolean, default: false  },
    published:          { type: Boolean, default: true   },
    createdAt:		{ type: Date,   default: Date.now},
    updatedAt:		{ type: Date,   default: Date.now}
});

Widget.plugin(mongoosePaginate);

module.exports = mongoose.model('Widget', Widget);
