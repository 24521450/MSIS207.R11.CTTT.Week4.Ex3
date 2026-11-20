import mongoose from 'mongoose';
import { FORUMS } from '../shared/forum.js';

const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  forum: { type: String, required: true, enum: FORUMS },
  author: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, required: true },
}, { bufferCommands: false, versionKey: false });

schema.index({ forum: 1, timestamp: 1, _id: 1 });

const Message = mongoose.model('Message', schema);

function toRecord({ id, author, text, timestamp }) {
  return { id, author, text, timestamp };
}

export async function connectMessageStore(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  await Message.init();

  return {
    async list(forum) {
      const messages = await Message.find({ forum }).sort({ timestamp: 1, _id: 1 }).lean();
      return messages.map(toRecord);
    },
    async insert(forum, message) {
      return toRecord(await Message.create({ ...message, forum }));
    },
  };
}
