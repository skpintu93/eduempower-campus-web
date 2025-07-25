import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  // Notification Information
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: 'drive' | 'training' | 'assessment' | 'general';

  // Recipients
  userIds: Types.ObjectId[];
  studentIds: Types.ObjectId[];
  allStudents: boolean;
  allStaff: boolean;

  // Delivery Status
  emailSent: boolean;
  smsSent: boolean;
  inAppRead: { userId: Types.ObjectId; readAt: Date }[];
  scheduledFor?: Date;

  // Account Association
  accountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    // Notification Information
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: ['info', 'success', 'warning', 'error'],
        message: 'Notification type must be one of: info, success, warning, error'
      }
    },
    category: {
      type: String,
      enum: {
        values: ['drive', 'training', 'assessment', 'general'],
        message: 'Category must be one of: drive, training, assessment, general'
      },
      default: 'general'
    },

    // Recipients
    userIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    studentIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Student',
      default: []
    },
    allStudents: {
      type: Boolean,
      default: false
    },
    allStaff: {
      type: Boolean,
      default: false
    },

    // Delivery Status
    emailSent: {
      type: Boolean,
      default: false
    },
    smsSent: {
      type: Boolean,
      default: false
    },
    inAppRead: {
      type: [{
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    scheduledFor: {
      type: Date,
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Scheduled date must be in the future'
      }
    },

    // Account Association
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required']
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to validate recipients
NotificationSchema.pre('save', function(next) {
  // At least one recipient must be specified
  if (!this.allStudents && !this.allStaff && 
      this.userIds.length === 0 && this.studentIds.length === 0) {
    return next(new Error('At least one recipient must be specified'));
  }
  next();
});

// Create index on accountId + createdAt
NotificationSchema.index({ accountId: 1, createdAt: -1 });

// Create index on type for filtering
NotificationSchema.index({ accountId: 1, type: 1 });

// Create index on category for filtering
NotificationSchema.index({ accountId: 1, category: 1 });

// Create index on scheduledFor for scheduled notifications
NotificationSchema.index({ accountId: 1, scheduledFor: 1 });

// Create index on emailSent and smsSent for delivery tracking
NotificationSchema.index({ accountId: 1, emailSent: 1, smsSent: 1 });

// Create text index for search functionality
NotificationSchema.index({ 
  title: 'text', 
  message: 'text'
});

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification; 