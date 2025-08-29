require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.bbehhfndfwtxvqllfnvp',
      password: 'duyang3927',
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  },
  
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './database/migrations'
    }
  }
};