import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPlacementDrive extends Document {
  // Company Information
  companyId: Types.ObjectId;
  jobTitle: string;
  jobDescription: string;
  jobLocation?: string;
  ctc: { min: number; max: number };
  jobType: 'full-time' | 'internship' | 'contract';

  // Eligibility Criteria
  minCGPA: number;
  maxBacklogs: number;
  eligibleBranches: string[];
  eligibleSemesters?: number[];
  requiredSkills: string[];

  // Schedule Information
  registrationDeadline: Date;
  testDate?: Date;
  interviewRounds: { name: string; date: Date; type: string }[];
  driveDate: Date;

  // Status & Results
  isActive: boolean;
  status: 'draft' | 'open' | 'closed' | 'completed';
  registeredStudents: { studentId: Types.ObjectId; registeredAt: Date; status: string }[];
  results: { studentId: Types.ObjectId; round: string; status: string; feedback?: string }[];

  // Account Association
  accountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlacementDriveSchema = new Schema<IPlacementDrive>(
  {
    // Company Information
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required']
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [2000, 'Job description cannot exceed 2000 characters']
    },
    jobLocation: {
      type: String,
      trim: true,
      maxlength: [100, 'Job location cannot exceed 100 characters']
    },
    ctc: {
      min: {
        type: Number,
        required: [true, 'Minimum CTC is required'],
        min: [0, 'Minimum CTC cannot be negative']
      },
      max: {
        type: Number,
        required: [true, 'Maximum CTC is required'],
        min: [0, 'Maximum CTC cannot be negative']
      }
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: {
        values: ['full-time', 'internship', 'contract'],
        message: 'Job type must be one of: full-time, internship, contract'
      }
    },

    // Eligibility Criteria
    minCGPA: {
      type: Number,
      required: [true, 'Minimum CGPA is required'],
      min: [0, 'Minimum CGPA cannot be negative'],
      max: [10, 'Minimum CGPA cannot exceed 10']
    },
    maxBacklogs: {
      type: Number,
      required: [true, 'Maximum backlogs is required'],
      min: [0, 'Maximum backlogs cannot be negative']
    },
    eligibleBranches: {
      type: [String],
      required: [true, 'At least one eligible branch is required'],
      validate: {
        validator: function(branches: string[]) {
          return branches.length > 0;
        },
        message: 'At least one eligible branch is required'
      }
    },
    eligibleSemesters: {
      type: [Number],
      validate: {
        validator: function(semesters: number[]) {
          return semesters.every(sem => sem >= 1 && sem <= 12);
        },
        message: 'Semesters must be between 1 and 12'
      }
    },
    requiredSkills: {
      type: [String],
      default: []
    },

    // Schedule Information
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Registration deadline must be in the future'
      }
    },
    testDate: {
      type: Date,
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Test date must be in the future'
      }
    },
    interviewRounds: {
      type: [{
        name: {
          type: String,
          required: true,
          maxlength: [50, 'Round name cannot exceed 50 characters']
        },
        date: {
          type: Date,
          required: true,
          validate: {
            validator: function(date: Date) {
              return date > new Date();
            },
            message: 'Interview date must be in the future'
          }
        },
        type: {
          type: String,
          required: true,
          enum: ['technical', 'hr', 'aptitude', 'group-discussion', 'other']
        }
      }],
      default: []
    },
    driveDate: {
      type: Date,
      required: [true, 'Drive date is required'],
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Drive date must be in the future'
      }
    },

    // Status & Results
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['draft', 'open', 'closed', 'completed'],
        message: 'Status must be one of: draft, open, closed, completed'
      },
      default: 'draft'
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
        },
        status: {
          type: String,
          required: true,
          enum: ['registered', 'shortlisted', 'rejected', 'selected', 'withdrawn'],
          default: 'registered'
        }
      }],
      default: []
    },
    results: {
      type: [{
        studentId: {
          type: Schema.Types.ObjectId,
          ref: 'Student',
          required: true
        },
        round: {
          type: String,
          required: true,
          maxlength: [50, 'Round name cannot exceed 50 characters']
        },
        status: {
          type: String,
          required: true,
          enum: ['passed', 'failed', 'pending', 'absent']
        },
        feedback: {
          type: String,
          maxlength: [500, 'Feedback cannot exceed 500 characters']
        }
      }],
      default: []
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
PlacementDriveSchema.index({ accountId: 1, isActive: 1 });

// Create index on status for filtering
PlacementDriveSchema.index({ accountId: 1, status: 1 });

// Create index on driveDate for scheduling
PlacementDriveSchema.index({ accountId: 1, driveDate: 1 });

// Create index on companyId for company-specific drives
PlacementDriveSchema.index({ accountId: 1, companyId: 1 });

// Create text index for search functionality
PlacementDriveSchema.index({ 
  jobTitle: 'text', 
  jobDescription: 'text',
  jobLocation: 'text'
});

const PlacementDrive = mongoose.models.PlacementDrive || mongoose.model<IPlacementDrive>('PlacementDrive', PlacementDriveSchema);

export default PlacementDrive; 