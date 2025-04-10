import { resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg'; // Use node-postgres directly for cleanup/seeding

import * as dotenv from 'dotenv';

// Import your Drizzle schema if you need programmatic seeding
import * as schema from '../src/database/schema'; // Uncomment if you use schema for seeding
import type { NewUser } from '../src/database/schema';

// --- Load .env.test for the setup script ---
process.env.NODE_ENV = 'test';

const envPathBase = resolve(__dirname, '../.env');
dotenv.config({ path: envPathBase }); // Don't override here

// Load .env.test and override
const envPathTest = resolve(__dirname, '../.env.test');
dotenv.config({ path: envPathTest, override: true });

const dsn = process.env.DSN;

// Re-check DSN after loading
if (!dsn) {
  throw new Error(
    `❌ Test Database DSN not found after loading .env files (${envPathTest}, ${envPathBase}). Make sure DSN is set in .env.test.`,
  );
}

console.log('Setup: Preparing test database using variables ..');
console.table({
  dsn,
  NODE_ENV: process.env.NODE_ENV,
  envPathBase,
  envPathTest,
});

async function prepareTestDatabase() {
  let directClient: Client | null = null; // Use a separate variable for the direct client

  try {
    console.log('Setup: Connecting directly to test database..');
    directClient = new Client({ connectionString: dsn });
    await directClient.connect();

    console.log(
      'Setup: Cleaning database (dropping/creating public,drizzle schema)...',
    );

    // Use IF EXISTS and CASCADE for robustness
    await directClient.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await directClient.query('DROP SCHEMA IF EXISTS drizzle CASCADE;');
    await directClient.query('CREATE SCHEMA public;');
    console.log('Setup: Schema cleaned.');

    const db = drizzle(directClient);
    const migrationsFolder = resolve(__dirname, '../src/database/migrations');
    await migrate(db, { migrationsFolder: migrationsFolder });
    console.log('Database migration completed successfully.');

    console.log('Setup: Seeding data...');
    for (let i = 0; i < 100; i++) {
      const u = generateRandomUser();
      // console.table(u);
      await db.insert(schema.users).values(u).onConflictDoNothing().returning();
    }
    console.log(
      'Setup: Example seed data inserted (if table/user did not exist).',
    );

    console.log('Setup: Data seeding complete.');
    console.log(`✅ Setup: Test database prepared successfully.`);
  } catch (error) {
    console.error('❌ Setup: Failed to prepare test database:', error);
    process.exit(1); // Ensure setup failure stops the test run
  } finally {
    // Ensure the seeding client connection is closed if it was opened
    if (directClient) {
      try {
        await directClient.end();
        console.log('Setup: Final cleanup: DB connection closed.');
      } catch (closeError) {
        console.error('Setup: Error closing final DB connection:', closeError);
      }
    }
  }
}

function generateRandomUser(): NewUser {
  // Arrays of sample data
  const firstNames = [
    'John',
    'Jane',
    'Michael',
    'Sarah',
    'David',
    'Emma',
    'Robert',
    'Lisa',
    'William',
    'Emily',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Wilson',
    'Taylor',
  ];
  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'HR',
    'Finance',
    'Operations',
    'Support',
    null,
  ];
  const statuses = ['A', 'I', 'T'];

  // Helper function to get random item from array
  const getRandomItem = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
  };

  // Generate random values
  const firstName = getRandomItem(firstNames);
  const lastName = getRandomItem(lastNames);
  const userName = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
  const email = `${userName}@example.com`;
  const userStatus = getRandomItem(statuses);
  const department = getRandomItem(departments);

  // Create and return the user object
  const randomUser: NewUser = {
    userName,
    firstName,
    lastName,
    email,
    userStatus,
    department,
  };

  return randomUser;
}

// === Execute the Preparation Function ===
await prepareTestDatabase();
