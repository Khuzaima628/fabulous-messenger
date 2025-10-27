import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ecdyzcpxhbyqzwimmnja.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZHl6Y3B4aGJ5cXp3aW1tbmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNTQ0ODAsImV4cCI6MjA3NjkzMDQ4MH0.kRE2n_P-eqoDs6iXyf00Q2HjYiPQh_XYmaT8S_N0rUg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const sendMessage = async (user, text, image, video, file) => {
    const { error } = await supabase
        .from('messages')
        .insert([
            {
                user_name: user,
                text,
                image,
                video,
                file,
                time: new Date().toLocaleTimeString(),
            },
        ]);

    if (error) console.error('Insert error:', error);
    else console.log('Message sent!');
};



export default supabase;