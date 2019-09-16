const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const uuidV4 = require('uuid/v4');

const { Schema } = mongoose;

const Widget = new Schema({
    _id: { type: String, default: uuidV4 },
    dataset: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: {
        type: String, required: true, trim: true, unique: true
    },
    userId: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    source: { type: String, required: false, trim: true },
    sourceUrl: { type: String, required: false, trim: true },
    authors: { type: String, required: false, trim: true },
    queryUrl: { type: String, required: false, trim: true },
    thumbnailUrl: { type: String, required: false, trim: true },
    env: {
        type: String, required: true, default: 'production', trim: true
    },
    widgetConfig: Schema.Types.Mixed,
    application: [{ type: String, required: true, trim: true }],
    layerId: { type: String, required: false, trim: true },
    verified: { type: Boolean, default: false },
    default: { type: Boolean, default: false },
    protected: { type: Boolean, default: false },
    defaultEditableWidget: { type: Boolean, default: false },
    template: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    freeze: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

Widget.plugin(mongoosePaginate);

module.exports = mongoose.model('Widget', Widget);
