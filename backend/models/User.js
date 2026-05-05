const mongoose = require('mongoose');

const whatsappSchema = new mongoose.Schema({
  phoneNumberId: { type: String },
  accessToken: { type: String },
  connected: { type: Boolean, default: false },
}, { _id: false });

const aiSettingsSchema = new mongoose.Schema({
  businessName: { type: String },
  product: { type: String },
  price: { type: String },
  tone: { type: String, default: 'friendly' },
  languageMode: { type: String, default: 'auto' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: {
    type: String,
    required: function requiredPassword() {
      return this.authProvider === 'email';
    },
  },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  plan: { type: String, enum: ['beta', 'premium', 'enterprise'], default: 'beta' },
  whatsapp: { type: whatsappSchema, default: () => ({}) },
  aiSettings: { type: aiSettingsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
