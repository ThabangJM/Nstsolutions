/**
 * Database Setup and Test Script
 * Run this to initialize and test the database connection
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('📦 Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server\n');

    // Read and execute schema file
    console.log('📄 Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔨 Creating database and tables...');
    await connection.query(schema);
    console.log('✅ Database and tables created successfully\n');

    // Close initial connection
    await connection.end();

    // Reconnect to the specific database
    console.log('🔌 Reconnecting to nstdb database...');
    connection = await mysql.createConnection({
      ...config,
      database: 'nstdb'
    });
    console.log('✅ Connected to nstdb database\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Tables created:');
    tables.forEach((table, index) => {
      const tableName = table[`Tables_in_nstdb`];
      console.log(`   ${index + 1}. ${tableName}`);
    });
    console.log('');

    // Check guest user
    console.log('👤 Checking default guest user...');
    const [users] = await connection.query('SELECT * FROM users WHERE uid = ?', ['guest']);
    if (users.length > 0) {
      console.log('✅ Guest user exists:', users[0]);
    } else {
      console.log('⚠️  Guest user not found');
    }
    console.log('');

    // Show table statistics
    console.log('📊 Database Statistics:');
    for (const table of tables) {
      const tableName = table[`Tables_in_nstdb`];
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`   ${tableName}: ${count[0].count} rows`);
    }
    console.log('');

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📝 Connection Details:');
    console.log('   Host: localhost');
    console.log('   Database: nstdb');
    console.log('   User: root');
    console.log('   Password: (empty)');
    console.log('\n✨ You can now start the server with: npm start');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure MySQL server is running');
    console.error('   2. Check your MySQL credentials');
    console.error('   3. Ensure root user has proper permissions');
    console.error('   4. Try running: mysql -u root -e "CREATE DATABASE nstdb;"');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup
setupDatabase();
