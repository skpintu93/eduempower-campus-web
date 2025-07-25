import dbConnect from './mongoose';

export async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    const mongoose = await dbConnect();
    
    // Test a simple operation
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('✅ Database connection successful!');
    console.log(`📊 Found ${collections.length} collections in database`);
    
    return {
      success: true,
      message: 'Database connection successful',
      collections: collections.length
    };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return {
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseConnection()
    .then((result) => {
      console.log('Test result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
} 