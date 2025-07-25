import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAssessment extends Document {
  // Assessment Information
  title: string;
  description?: string;
  type: 'aptitude' | 'technical' | 'mock-interview' | 'gd';
  category?: string;

  // Schedule Information
  date: Date;
  duration: number;
  platform?: string;
  venue?: string;

  // Associated Entities
  driveId?: Types.ObjectId;
  trainingId?: Types.ObjectId;
  isStandalone: boolean;

  // Results & Feedback
  studentScores: { studentId: Types.ObjectId; score: number; maxScore: number; feedback?: string }[];
  totalParticipants: number;
  averageScore: number;

  // Account Association
  accountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    // Assessment Information
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
      maxlength: [200, 'Assessment title cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    type: {
      type: String,
      required: [true, 'Assessment type is required'],
      enum: {
        values: ['aptitude', 'technical', 'mock-interview', 'gd'],
        message: 'Assessment type must be one of: aptitude, technical, mock-interview, gd'
      }
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters']
    },

    // Schedule Information
    date: {
      type: Date,
      required: [true, 'Assessment date is required'],
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Assessment date must be in the future'
      }
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [480, 'Duration cannot exceed 8 hours']
    },
    platform: {
      type: String,
      trim: true,
      maxlength: [100, 'Platform cannot exceed 100 characters']
    },
    venue: {
      type: String,
      trim: true,
      maxlength: [200, 'Venue cannot exceed 200 characters']
    },

    // Associated Entities
    driveId: {
      type: Schema.Types.ObjectId,
      ref: 'PlacementDrive'
    },
    trainingId: {
      type: Schema.Types.ObjectId,
      ref: 'Training'
    },
    isStandalone: {
      type: Boolean,
      default: true
    },

    // Results & Feedback
    studentScores: {
      type: [{
        studentId: {
          type: Schema.Types.ObjectId,
          ref: 'Student',
          required: true
        },
        score: {
          type: Number,
          required: true,
          min: [0, 'Score cannot be negative']
        },
        maxScore: {
          type: Number,
          required: true,
          min: [1, 'Maximum score must be at least 1']
        },
        feedback: {
          type: String,
          maxlength: [500, 'Feedback cannot exceed 500 characters']
        }
      }],
      default: []
    },
    totalParticipants: {
      type: Number,
      default: 0,
      min: [0, 'Total participants cannot be negative']
    },
    averageScore: {
      type: Number,
      default: 0,
      min: [0, 'Average score cannot be negative']
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

// Pre-save middleware to calculate totalParticipants and averageScore
AssessmentSchema.pre('save', function(next) {
  if (this.studentScores && this.studentScores.length > 0) {
    this.totalParticipants = this.studentScores.length;
    const totalScore = this.studentScores.reduce((sum, student) => sum + student.score, 0);
    this.averageScore = totalScore / this.totalParticipants;
  } else {
    this.totalParticipants = 0;
    this.averageScore = 0;
  }
  next();
});

// Create index on accountId + date
AssessmentSchema.index({ accountId: 1, date: 1 });

// Create index on type for filtering
AssessmentSchema.index({ accountId: 1, type: 1 });

// Create index on driveId for drive-specific assessments
AssessmentSchema.index({ accountId: 1, driveId: 1 });

// Create index on trainingId for training-specific assessments
AssessmentSchema.index({ accountId: 1, trainingId: 1 });

// Create index on isStandalone for standalone assessments
AssessmentSchema.index({ accountId: 1, isStandalone: 1 });

// Create text index for search functionality
AssessmentSchema.index({ 
  title: 'text', 
  description: 'text',
  category: 'text'
});

const Assessment = mongoose.models.Assessment || mongoose.model<IAssessment>('Assessment', AssessmentSchema);

export default Assessment; 