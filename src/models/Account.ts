import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAccount extends Document {
  name: string;
  phone?: string;
  domains: string[];
  accountType: string;
  signupType: string;
  settings: {
    theme: string;
    currency: string;
    timezone: string;
    logo: string;
    email: {
      primaryEmail: string;
      noreplyEmail: string;
    };
  };
  address: {
    pincode: string;
    addressLine: string;
    landmark?: string;
    city: string;
    district: string;
    state: string;
    country: string;
  };
  accreditation: string;
  yearEstablished: number;
  totalStudents: number;
  departments: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [100, 'Account name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    domains: {
      type: [String],
      required: [true, 'At least one domain is required'],
      validate: {
        validator: function(domains: string[]) {
          return domains.length > 0 && domains.every(domain => 
            /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(domain)
          );
        },
        message: 'Please provide valid domain names'
      }
    },
    accountType: {
      type: String,
      required: [true, 'Account type is required'],
      enum: ['school', 'college', 'university', 'institute'],
      default: 'college'
    },
    signupType: {
      type: String,
      required: [true, 'Signup type is required'],
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    settings: {
      theme: {
        type: String,
        default: 'light',
        enum: ['light', 'dark', 'auto']
      },
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP']
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      logo: {
        type: String,
        default: ''
      },
      email: {
        primaryEmail: {
          type: String,
          required: [true, 'Primary email is required'],
          match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
        },
        noreplyEmail: {
          type: String,
          match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
        }
      }
    },
    address: {
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
      },
      addressLine: {
        type: String,
        required: [true, 'Address line is required'],
        maxlength: [200, 'Address line cannot exceed 200 characters']
      },
      landmark: {
        type: String,
        maxlength: [100, 'Landmark cannot exceed 100 characters']
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        maxlength: [50, 'City name cannot exceed 50 characters']
      },
      district: {
        type: String,
        required: [true, 'District is required'],
        maxlength: [50, 'District name cannot exceed 50 characters']
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        maxlength: [50, 'State name cannot exceed 50 characters']
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        default: 'India',
        maxlength: [50, 'Country name cannot exceed 50 characters']
      }
    },
    accreditation: {
      type: String,
      required: [true, 'Accreditation is required'],
      maxlength: [100, 'Accreditation cannot exceed 100 characters']
    },
    yearEstablished: {
      type: Number,
      required: [true, 'Year established is required'],
      min: [1800, 'Year established must be after 1800'],
      max: [new Date().getFullYear(), 'Year established cannot be in the future']
    },
    totalStudents: {
      type: Number,
      required: [true, 'Total students count is required'],
      min: [1, 'Total students must be at least 1']
    },
    departments: {
      type: [String],
      required: [true, 'At least one department is required'],
      validate: {
        validator: function(departments: string[]) {
          return departments.length > 0;
        },
        message: 'At least one department is required'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Create compound index on domains
AccountSchema.index({ domains: 1 });

// Create index on accountType and isActive for filtering
AccountSchema.index({ accountType: 1, isActive: 1 });

// Create text index for search functionality
AccountSchema.index({ 
  name: 'text', 
  'address.city': 'text', 
  'address.state': 'text' 
});

const Account = mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);

export default Account; 