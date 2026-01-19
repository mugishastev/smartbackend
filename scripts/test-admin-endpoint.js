// Test script to verify the admin cooperatives endpoint
const API_BASE = 'http://localhost:5001/api';

async function testAdminCooperativesEndpoint() {
    console.log('🧪 Testing /api/admin/cooperatives endpoint...\n');

    try {
        // You'll need to replace this with a valid Super Admin JWT token
        const token = 'YOUR_SUPER_ADMIN_TOKEN_HERE';

        const response = await fetch(`${API_BASE}/admin/cooperatives`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', response.status, response.statusText);

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Error:', error);
            return;
        }

        const data = await response.json();
        console.log('\n✅ Response:');
        console.log('Message:', data.message);
        console.log('Cooperatives count:', data.cooperatives?.length || 0);
        console.log('Pagination:', data.pagination);

        if (data.cooperatives && data.cooperatives.length > 0) {
            console.log('\n📋 First cooperative:');
            const first = data.cooperatives[0];
            console.log({
                id: first.id,
                name: first.name,
                status: first.status,
                email: first.email,
                registrationNumber: first.registrationNumber
            });

            console.log('\n📊 Cooperatives by status:');
            const byStatus = data.cooperatives.reduce((acc, coop) => {
                acc[coop.status] = (acc[coop.status] || 0) + 1;
                return acc;
            }, {});
            console.log(byStatus);
        }

    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

// Run without token first to see auth error
async function testWithoutAuth() {
    console.log('🧪 Testing without authentication...\n');

    try {
        const response = await fetch(`${API_BASE}/admin/cooperatives`);
        console.log('Status:', response.status, response.statusText);

        if (response.status === 401) {
            console.log('✅ Correctly requires authentication\n');
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

// Run tests
(async () => {
    await testWithoutAuth();
    console.log('─'.repeat(50));
    console.log('\n⚠️  To test with authentication, update the token in this script\n');
    console.log('You can get a token by:');
    console.log('1. Login as Super Admin in the frontend');
    console.log('2. Open browser DevTools → Application → Local Storage');
    console.log('3. Copy the "token" value');
    console.log('4. Replace YOUR_SUPER_ADMIN_TOKEN_HERE in this script\n');
})();
