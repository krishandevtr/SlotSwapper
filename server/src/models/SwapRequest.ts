import mongoose, { Schema, Document, Types } from 'mongoose';

export type SwapStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ISwapRequest extends Document {
  requesterId: Types.ObjectId; // user offering their slot
  responderId: Types.ObjectId; // owner of desired slot
  mySlotId: Types.ObjectId;    // requester's slot
  theirSlotId: Types.ObjectId; // responder's slot
  status: SwapStatus;
}

const SwapRequestSchema = new Schema<ISwapRequest>({

  requesterId:
  {
    type: Schema.Types.ObjectId, ref: 'User', required: true
  },
  responderId: {
    type: Schema.Types.ObjectId,
    ref: 'User', required: true
  },

  mySlotId: {
    type: Schema.Types.ObjectId,
    ref: 'Event', required: true
  },

  theirSlotId: {
    type: Schema.Types.ObjectId,
    ref: 'Event', required: true
  },

  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING'
  }

}, { timestamps: true });

export const SwapRequestModel = mongoose.model<ISwapRequest>('SwapRequest', SwapRequestSchema);
