import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITraining extends Document {
  // Training Information
  title: string;
  description: string;
  type: 'internal' | 'external';
  category: string;
  duration: number;

  // Schedule Information
  startDate: Date;
  endDate: Date;
  schedule: { day: string; time: string }[];
  venue?: string;

  // Trainer Information
  trainerId?: Types.ObjectId;
  trainerName: string;
  trainerEmail: string;
  maxParticipants: number;

  // Status & Attendance
  isActive: boolean;
  status: 'upcoming' | 'ongoing' | 'completed';
  registeredStudents: { studentId: Types.ObjectId; registeredAt: Date }[];
  attendance: { studentId: Types.ObjectId; date: Date; present: boolean }[];

  // Assessment & Certification
  quizEnabled: boolean;
  certificateTemplate?: string;
  completionCriteria?: string;

  // Account Association
  accountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingSchema = new Schema<ITraining>(
  {
    // Training Information
    title: {
      type: String,
      required: [true, 'Training title is required'],
      trim: true,
      maxlength: [200, 'Training title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Training description is required'],
      maxlength: [2000, 'Training description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'Training type is required'],
      enum: {
        values: ['internal', 'external'],
        message: 'Training type must be one of: internal, external'
      }
    },
    category: {
      type: String,
      required: [true, 'Training category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters']
    },
    duration: {
      type: Number,
      required: [true, 'Training duration is required'],
      min: [1, 'Duration must be at least 1 hour']
    },

    // Schedule Information
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Start date must be in the future'
      }
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(date: Date) {
          return date > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    schedule: {
      type: [{
        day: {
          type: String,
          required: true,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        time: {
          type: String,
          required: true,
          match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
        }
      }],
      default: []
    },
    venue: {
      type: String,
      trim: true,
      maxlength: [200, 'Venue cannot exceed 200 characters']
    },

    // Trainer Information
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    trainerName: {
      type: String,
      required: [true, 'Trainer name is required'],
      trim: true,
      maxlength: [100, 'Trainer name cannot exceed 100 characters']
    },
    trainerEmail: {
      type: String,
      required: [true, 'Trainer email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Maximum participants is required'],
      min: [1, 'Maximum participants must be at least 1']
    },

    // Status & Attendance
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['upcoming', 'ongoing', 'completed'],
        message: 'Status must be one of: upcoming, ongoing, completed'
      },
      default: 'upcoming'
    },
    registeredStudents: {
      type: [{
        studentId: {
          type: Schema.Types.ObjectId,
          ref: 'Student',
          required: true
        },
        registeredAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    attendance: {
      type: [{
        studentId: {
          type: Schema.Types.ObjectId,
          ref: 'Student',
          required: true
        },
        date: {
          type: Date,
          required: true
        },
        present: {
          type: Boolean,
          required: true
        }
      }],
      default: []
    },

    // Assessment & Certification
    quizEnabled: {
      type: Boolean,
      default: false
    },
    certificateTemplate: {
      type: String,
      maxlength: [1000, 'Certificate template cannot exceed 1000 characters']
    },
    completionCriteria: {
      type: String,
      maxlength: [500, 'Completion criteria cannot exceed 500 characters']
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

// Create index on accountId + isActive
TrainingSchema.index({ accountId: 1, isActive: 1 });

// Create index on status for filtering
TrainingSchema.index({ accountId: 1, status: 1 });

// Create index on startDate for scheduling
TrainingSchema.index({ accountId: 1, startDate: 1 });

// Create index on trainerId for trainer-specific trainings
TrainingSchema.index({ accountId: 1, trainerId: 1 });

// Create index on category for filtering
TrainingSchema.index({ accountId: 1, category: 1 });

// Create text index for search functionality
TrainingSchema.index({ 
  title: 'text', 
  description: 'text',
  category: 'text'
});

const Training = mongoose.models.Training || mongoose.model<ITraining>('Training', TrainingSchema);

export default Training; 