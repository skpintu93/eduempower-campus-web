import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStudent extends Document {
  // Personal Information
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  profilePic?: string;

  // Academic Information
  rollNumber: string;
  branch: string;
  semester: number;
  cgpa: number;
  backlogs: number;
  batchYear: number;
  section?: string;

  // Documents & Skills
  resume?: string;
  certificates: string[];
  documents: { name: string; url: string; type: string }[];
  technicalSkills: string[];
  softSkills: string[];
  languages: string[];

  // Placement Status
  registeredDrives: { driveId: Types.ObjectId; status: string; registeredAt: Date }[];
  offers: { companyId: Types.ObjectId; ctc: number; position: string; offerDate: Date }[];
  trainingStatus: { trainingId: Types.ObjectId; status: string; completionDate?: Date }[];
  isPlaced: boolean;
  placementDate?: Date;

  // Account Association
  accountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    // Personal Information
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [100, 'Student name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(date: Date) {
          return date < new Date();
        },
        message: 'Date of birth cannot be in the future'
      }
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be one of: male, female, other'
      }
    },
    profilePic: {
      type: String,
      default: ''
    },

    // Academic Information
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
      maxlength: [20, 'Roll number cannot exceed 20 characters']
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      maxlength: [50, 'Branch name cannot exceed 50 characters']
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12']
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10']
    },
    backlogs: {
      type: Number,
      default: 0,
      min: [0, 'Backlogs cannot be negative']
    },
    batchYear: {
      type: Number,
      required: [true, 'Batch year is required'],
      min: [2000, 'Batch year must be after 2000'],
      max: [new Date().getFullYear() + 4, 'Batch year cannot be more than 4 years in the future']
    },
    section: {
      type: String,
      trim: true,
      maxlength: [5, 'Section cannot exceed 5 characters']
    },

    // Documents & Skills
    resume: {
      type: String,
      default: ''
    },
    certificates: {
      type: [String],
      default: []
    },
    documents: {
      type: [{
        name: {
          type: String,
          required: true,
          maxlength: [100, 'Document name cannot exceed 100 characters']
        },
        url: {
          type: String,
          required: true
        },
        type: {
          type: String,
          required: true,
          enum: ['resume', 'certificate', 'transcript', 'other']
        }
      }],
      default: []
    },
    technicalSkills: {
      type: [String],
      default: []
    },
    softSkills: {
      type: [String],
      default: []
    },
    languages: {
      type: [String],
      default: []
    },

    // Placement Status
    registeredDrives: {
      type: [{
        driveId: {
          type: Schema.Types.ObjectId,
          ref: 'PlacementDrive',
          required: true
        },
        status: {
          type: String,
          required: true,
          enum: ['registered', 'shortlisted', 'rejected', 'selected', 'withdrawn']
        },
        registeredAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    offers: {
      type: [{
        companyId: {
          type: Schema.Types.ObjectId,
          ref: 'Company',
          required: true
        },
        ctc: {
          type: Number,
          required: true,
          min: [0, 'CTC cannot be negative']
        },
        position: {
          type: String,
          required: true,
          maxlength: [100, 'Position cannot exceed 100 characters']
        },
        offerDate: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    trainingStatus: {
      type: [{
        trainingId: {
          type: Schema.Types.ObjectId,
          ref: 'Training',
          required: true
        },
        status: {
          type: String,
          required: true,
          enum: ['registered', 'ongoing', 'completed', 'dropped']
        },
        completionDate: {
          type: Date
        }
      }],
      default: []
    },
    isPlaced: {
      type: Boolean,
      default: false
    },
    placementDate: {
      type: Date
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

// Create compound index on accountId + rollNumber
StudentSchema.index({ accountId: 1, rollNumber: 1 }, { unique: true });

// Create compound index on accountId + email
StudentSchema.index({ accountId: 1, email: 1 }, { unique: true });

// Create index on branch and semester for filtering
StudentSchema.index({ accountId: 1, branch: 1, semester: 1 });

// Create index on cgpa for eligibility checks
StudentSchema.index({ accountId: 1, cgpa: 1 });

// Create index on isPlaced for placement status
StudentSchema.index({ accountId: 1, isPlaced: 1 });

// Create text index for search functionality
StudentSchema.index({ 
  name: 'text', 
  email: 'text',
  rollNumber: 'text',
  branch: 'text'
});

const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student; 