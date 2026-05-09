const { createClient } = require('@supabase/supabase-js');
// load env
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.rpc('add_sort_index_column', {});
  console.log("RPC Error (expected if not exists):", error);
  // Alternative: update via REST by just sending one update. If it fails, we know it's missing.
  const { error: testErr } = await supabase.from('wallets').update({ sort_index: 0 }).eq('id', '1234');
  if (testErr && testErr.message.includes('column "sort_index" of relation "wallets" does not exist')) {
    console.log("sort_index is MISSING!");
  } else {
    console.log("sort_index EXISTS or other error:", testErr);
  }
}
run();
