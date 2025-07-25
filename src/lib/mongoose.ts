import mongoose from 'mongoose';

// Import model registry to ensure all models are registered
import '@/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduempower-campus';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<mongoose.Connection> {
  if (cached.conn) {
    console.debug('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      dbName: process.env.MONGODB_DB_NAME,
      authSource: 'admin',
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongoose) => {
      console.log('✅ New database connection established');
      
      // Sync indexes for all models (only in development)
      if (process.env.NODE_ENV === 'development') {
        try {
          console.log('Syncing database indexes...');
          const models = Object.values(mongoose.models);
          for (const model of models) {
            await model.syncIndexes();
          }
          console.log('Database indexes synced successfully');
        } catch (error) {
          console.warn('Warning: Failed to sync some indexes:', error);
        }
      }
      
      return mongoose.connection;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: unknown) {
    cached.promise = null;
    if (e instanceof Error) {
      console.error('❌ Database connection error:', e.message);
    } else {
      console.error('❌ Database connection error:', e);
    }
    throw e;
  }

  return cached.conn;
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

export default dbConnect; 