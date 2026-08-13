require('dotenv').config()

const {Pool} = require('pg');
const {drizzle} = require('drizzle-orm/node-postgres');
const schema = require('./schema');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD), 
    database: process.env.DB_NAME,
})

const db = drizzle(pool, {schema})

module.exports = {db}