/**
 * Setup Storage Buckets
 * Run this once to initialize required Supabase storage buckets
 * 
 * Usage: npx ts-node tools/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBuckets() {
  try {
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const bucketNames = buckets?.map((b: any) => b.name) || [];
    console.log('Existing buckets:', bucketNames);

    // Create signatures bucket if it doesn't exist (PRIVATE for security)
    if (!bucketNames.includes('signatures')) {
      console.log('Creating signatures bucket...');
      const { data, error } = await supabase.storage.createBucket('signatures', {
        public: false, // Private bucket - only authenticated users with RLS permissions
      });

      if (error) {
        console.error('Error creating signatures bucket:', error);
      } else {
        console.log('✓ signatures bucket created successfully (private)');
      }
    } else {
      console.log('✓ signatures bucket already exists');
    }
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
}

setupBuckets();
