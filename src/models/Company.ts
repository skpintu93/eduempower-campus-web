import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICompany extends Document {
  // Company Information
  name: string;
  website?: string;
  industry: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  description?: string;
  logo?: string;

  // Contact Information
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  secondaryContact?: {
    name: string;
    email: string;
    phone: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };

  // Approval Status
  isApproved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;

  // Account Association
  accountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    // Company Information
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        'Please enter a valid website URL'
      ]
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      maxlength: [50, 'Industry cannot exceed 50 characters']
    },
    size: {
      type: String,
      enum: {
        values: ['startup', 'small', 'medium', 'large', 'enterprise'],
        message: 'Company size must be one of: startup, small, medium, large, enterprise'
      }
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    logo: {
      type: String,
      default: ''
    },

    // Contact Information
    primaryContact: {
      name: {
        type: String,
        required: [true, 'Primary contact name is required'],
        trim: true,
        maxlength: [100, 'Contact name cannot exceed 100 characters']
      },
      email: {
        type: String,
        required: [true, 'Primary contact email is required'],
        lowercase: true,
        trim: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          'Please enter a valid email address'
        ]
      },
      phone: {
        type: String,
        required: [true, 'Primary contact phone is required'],
        trim: true,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
      }
    },
    secondaryContact: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Contact name cannot exceed 100 characters']
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          'Please enter a valid email address'
        ]
      },
      phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
      }
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, 'City name cannot exceed 50 characters']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State name cannot exceed 50 characters']
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country name cannot exceed 50 characters']
      },
      pincode: {
        type: String,
        match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
      }
    },

    // Approval Status
    isApproved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters']
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

// Create index on accountId + isApproved
CompanySchema.index({ accountId: 1, isApproved: 1 });

// Create index on industry for filtering
CompanySchema.index({ accountId: 1, industry: 1 });

// Create index on size for filtering
CompanySchema.index({ accountId: 1, size: 1 });

// Create text index for search functionality
CompanySchema.index({ 
  name: 'text', 
  industry: 'text',
  description: 'text'
});

const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company; 