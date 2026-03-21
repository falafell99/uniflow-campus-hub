import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching vault_files with null uploader_id...');
  const { data: files, error: fetchError } = await supabase
    .from('vault_files')
    .select('*')
    .is('uploader_id', null);

  if (fetchError) {
    console.error('Error fetching files:', fetchError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('No files to update.');
    return;
  }

  console.log(`Found ${files.length} files. Fetching profiles...`);
  
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, display_name');

  if (profError) {
    console.error('Error fetching profiles:', profError);
    return;
  }

  const profileMap = {};
  profiles?.forEach(p => {
    profileMap[p.display_name] = p.id;
  });

  let updated = 0;
  for (const file of files) {
    const profileId = profileMap[file.uploader];
    if (profileId) {
      console.log(`Updating file ${file.id} with uploader_id ${profileId}`);
      const { error } = await supabase
        .from('vault_files')
        .update({ uploader_id: profileId })
        .eq('id', file.id);
      
      if (error) {
        console.error(`Error updating file ${file.id}:`, error);
      } else {
        updated++;
      }
    } else {
      console.log(`No profile found for uploader: ${file.uploader}`);
    }
  }

  console.log(`Finished updating ${updated}/${files.length} files.`);
}

run();
