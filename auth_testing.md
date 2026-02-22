# Auth Testing Playbook — UbukweHub

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  role: 'staff',
  picture: 'https://via.placeholder.com/150',
  is_active: true,
  mfa_enabled: false,
  mfa_methods: [],
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API

```bash
API_URL=https://ubukwe-weddings.preview.emergentagent.com

# Test auth with JWT
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jeanpaul@ubukwe.rw","password":"Staff@2025!"}'

# Test auth/me
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"jeanpaul@ubukwe.rw","password":"Staff@2025!"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))")
curl -X GET "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"

# Test inventory
curl -X GET "$API_URL/api/inventory" -H "Authorization: Bearer $TOKEN"

# Test events
curl -X GET "$API_URL/api/events" -H "Authorization: Bearer $TOKEN"
```

## Step 3: Browser Testing

```javascript
// Set session token cookie and navigate
await page.context().addCookies([{
    name: "session_token",
    value: "YOUR_SESSION_TOKEN",
    domain: "ubukwe-weddings.preview.emergentagent.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "None"
}]);
await page.goto("https://ubukwe-weddings.preview.emergentagent.com/dashboard");
```

## Quick Debug

```bash
# Check data
mongosh --eval "use('test_database'); db.users.find().limit(2).pretty();"

# Clean test data
mongosh --eval "use('test_database'); db.users.deleteMany({email: /test\.user\./}); db.user_sessions.deleteMany({session_token: /test_session/});"
```

## Checklist
- [ ] User document has user_id field
- [ ] Session user_id matches user's user_id
- [ ] All queries use `{"_id": 0}` projection
- [ ] /api/auth/me returns user data
- [ ] Dashboard loads without redirect
- [ ] Admin login with MFA works
- [ ] RBAC blocks unauthorized access

## Login Credentials (Seed Data)
- Admin: benishimwe31@gmail.com / Admin@2025! (MFA: TOTP + Email OTP)
- Staff: jeanpaul@ubukwe.rw / Staff@2025!
- Client: client@example.rw / Client@2025!
