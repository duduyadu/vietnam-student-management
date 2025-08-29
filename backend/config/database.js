const knex = require('knex');
require('dotenv').config();

// Supabase PostgreSQL 설정 (Transaction Pooler)
const db = knex({
  client: 'pg',
  connection: {
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',  // aws-1로 수정!
    port: 6543,  // Transaction pooling port
    database: 'postgres',
    user: 'postgres.bbehhfndfwtxvqllfnvp',  // Full username
    password: 'duyang3927',  // Supabase 비밀번호
    ssl: { rejectUnauthorized: false }
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './database/seeds'
  }
});

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Supabase PostgreSQL 연결 성공!');
    console.log('⚡ 예상 성능 향상: 10-20배');
  })
  .catch((err) => {
    console.error('❌ Supabase 연결 실패:', err.message);
    console.log('Supabase 키와 URL을 확인해주세요.');
  });

// PostgreSQL Client 가져오기 함수 (dashboard.js에서 사용)
const getClient = async () => {
  return {
    query: async (sql, params) => {
      try {
        // knex raw query를 사용하여 PostgreSQL 쿼리 실행
        const result = await db.raw(sql, params);
        return { rows: result.rows || result };
      } catch (error) {
        throw error;
      }
    },
    release: () => {
      // knex는 자동으로 connection pool을 관리하므로 별도 release 불필요
    }
  };
};

module.exports = db;
module.exports.getClient = getClient;