require('dotenv').config();
const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/direct_messages?read=eq.false&select=*`;
fetch(url, {
  headers: {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
  }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
