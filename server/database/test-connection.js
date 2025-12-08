/**
 * Test Database Connection
 * Quick script to verify database connectivity
 */

const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nstdb'
};

async function testConnection() {
  let connection;
  
  try {
    console.log('🔌 Testing MySQL connection...');
    console.log('   Host:', config.host);
    console.log('   Database:', config.database);
    console.log('   User:', config.user);
    console.log('');

    connection = await mysql.createConnection(config);
    console.log('✅ Successfully connected to MySQL!\n');

    // Test query
    console.log('🔍 Running test query...');
    const [result] = await connection.query('SELECT 1 + 1 AS solution');
    console.log('✅ Test query successful:', result[0].solution, '=', 2);
    console.log('');

    // Get database version
    const [version] = await connection.query('SELECT VERSION() as version');
    console.log('📊 MySQL Version:', version[0].version);
    console.log('');

    // List tables
    const [tables] = await connection.query('SHOW TABLES');
    if (tables.length > 0) {
      console.log('📋 Tables in database:');
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table[`Tables_in_${config.database}`]}`);
      });
    } else {
      console.log('⚠️  No tables found. Run setup.js first.');
    }
    console.log('');

    // Test table access
    console.log('👤 Testing users table...');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table accessible: ${users[0].count} users`);
    console.log('');

    console.log('🎉 All tests passed! Database is ready.');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n🔧 Error Details:');
    console.error('   Code:', error.code);
    console.error('   errno:', error.errno);
    console.error('   sqlState:', error.sqlState);
    
    console.error('\n💡 Possible Solutions:');
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   - Database does not exist. Run: node database/setup.js');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   - MySQL server is not running');
      console.error('   - Check if MySQL service is started');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   - Invalid username or password');
      console.error('   - Check your MySQL credentials');
    } else {
      console.error('   - Check MySQL server status');
      console.error('   - Verify connection settings in database.js');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('👋 Connection closed.');
    }
  }
}

// Run test
testConnection();
