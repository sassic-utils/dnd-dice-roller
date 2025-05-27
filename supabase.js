const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;
console.log(SUPABASE_URL, SUPABASE_KEY);

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// User functions
async function getOrCreateUser(userName) {
    // Check if user exists in local storage
    let userId = localStorage.getItem('supabaseUserId');
    
    if (!userId) {
        // Create a new user
        const { data, error } = await supabaseClient
            .from('users')
            .insert({ user_name: userName || 'Anonymous' })
            .select()
            .single();
            
        if (error) {
            console.error('Error creating user:', error);
            return null;
        }
        
        userId = data.id;
        localStorage.setItem('supabaseUserId', userId);
    }
    
    return userId;
}

// Roll functions
async function storeRoll(userId, diceType, diceCount, results, total) {
    try {
        const { data, error } = await supabaseClient
            .from('rolls')
            .insert({
                user_id: userId,
                dice_type: diceType,
                dice_count: diceCount,
                results: Array.isArray(results) ? results : [results],
                total: total || (Array.isArray(results) ? null : results)
            });
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error storing roll:', error);
        return null;
    }
}

// Fetch all rolls for the history display
async function fetchAllRolls() {
    try {
        const { data, error } = await supabaseClient
            .from('rolls')
            .select(`
                id,
                dice_type,
                dice_count,
                results,
                total,
                created_at,
                users (id, user_name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching rolls:', error);
        return [];
    }
}

// Fetch only user's rolls
async function fetchUserRolls(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('rolls')
            .select(`
                id,
                dice_type,
                dice_count,
                results,
                total,
                created_at,
                users (id, user_name)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user rolls:', error);
        return [];
    }
}

// Set up real-time subscription to new rolls
function subscribeToRolls(callback) {
    return supabaseClient
        .channel('public:rolls')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'rolls' }, 
            payload => {
                callback(payload.new);
            }
        )
        .subscribe();
}

// Export functions for use in main script
window.supabaseAPI = {
    getOrCreateUser,
    storeRoll,
    fetchAllRolls,
    fetchUserRolls,
    subscribeToRolls
};
