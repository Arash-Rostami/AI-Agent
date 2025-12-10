import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: true
  },
  origin: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

export default AccessLog;
