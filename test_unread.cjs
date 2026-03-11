const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('direct_messages').select('*').eq('read', false);
  console.log("Unread messages:", data);
  console.log("Error:", error);
}
run();
