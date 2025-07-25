// Export all models
export { default as Account, type IAccount } from './Account';
export { default as User, type IUser } from './User';
export { default as Student, type IStudent } from './Student';
export { default as Company, type ICompany } from './Company';
export { default as PlacementDrive, type IPlacementDrive } from './PlacementDrive';
export { default as Training, type ITraining } from './Training';
export { default as Assessment, type IAssessment } from './Assessment';
export { default as Notification, type INotification } from './Notification';

// Model relationships and utilities
import mongoose from 'mongoose';
import Account from './Account';
import User from './User';
import Student from './Student';
import Company from './Company';
import PlacementDrive from './PlacementDrive';
import Training from './Training';
import Assessment from './Assessment';
import Notification from './Notification';

// Model validation utilities
export const validateObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

export const validatePassword = (password: string): boolean => {
  // At least one uppercase letter, one lowercase letter, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  return passwordRegex.test(password) && password.length >= 8;
};

// Model relationship helpers
export const getModelRelationships = () => {
  return {
    Account: {
      hasMany: ['User', 'Student', 'Company', 'PlacementDrive', 'Training', 'Assessment', 'Notification'],
      foreignKey: 'accountId'
    },
    User: {
      belongsTo: 'Account',
      hasMany: ['Company'], // approvedBy field
      foreignKey: 'accountId'
    },
    Student: {
      belongsTo: 'Account',
      hasMany: ['PlacementDrive', 'Training', 'Assessment'], // through arrays
      foreignKey: 'accountId'
    },
    Company: {
      belongsTo: 'Account',
      hasMany: ['PlacementDrive'],
      foreignKey: 'accountId'
    },
    PlacementDrive: {
      belongsTo: ['Account', 'Company'],
      hasMany: ['Student', 'Assessment'],
      foreignKey: 'accountId'
    },
    Training: {
      belongsTo: ['Account', 'User'], // trainerId
      hasMany: ['Student', 'Assessment'],
      foreignKey: 'accountId'
    },
    Assessment: {
      belongsTo: ['Account', 'PlacementDrive', 'Training'],
      hasMany: ['Student'],
      foreignKey: 'accountId'
    },
    Notification: {
      belongsTo: 'Account',
      hasMany: ['User', 'Student'],
      foreignKey: 'accountId'
    }
  };
};

// Export all models as default
export default {
  Account,
  User,
  Student,
  Company,
  PlacementDrive,
  Training,
  Assessment,
  Notification
}; 