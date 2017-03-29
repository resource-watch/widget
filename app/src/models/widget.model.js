const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const uuidV4 = require('uuid/v4');
const Schema = mongoose.Schema;

const Widget = new Schema({
    _id:		 { type: String, default: uuidV4                                },
    dataset:             { type: String, required: true },
    name:		 { type: String, required: true, trim: true                     },
    createdAt:		 { type: Date,   default: Date.now                              },
    updatedAt:		 { type: Date,   default: Date.now                              }
});

Widget.plugin(mongoosePaginate);

module.exports = mongoose.model('Widget', Widget);
