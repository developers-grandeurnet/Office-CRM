const mongoose = require("mongoose");

const clientAddressSchema = new mongoose.Schema({
    street: { type: String, trim: true, maxlength: 200, default: "" },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    state: { type: String, trim: true, maxlength: 80, default: "" },
    pincode: { type: String, trim: true, maxlength: 6, default: "" },
    landmark: { type: String, trim: true, maxlength: 120, default: "" },
}, { _id: false });

const clientSchema = new mongoose.Schema({
    clientId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    whatsapp: {
        type: String,
        trim: true,
        default: "",
    },
    address: {
        type: clientAddressSchema,
        default: () => ({}),
    },
    remark: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
    },
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });

clientSchema.index({ user: 1 });

module.exports = mongoose.model("Client", clientSchema);
