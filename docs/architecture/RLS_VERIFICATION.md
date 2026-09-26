# RLS Verification Procedure

Once a PostgreSQL instance (like local Supabase) is running, you can verify the Row Level Security (RLS) implementation by executing the following tests.

## 1. Setup Test Data

Create two test users in Supabase Auth, let's say `user_a` and `user_b`.
Create two organizations, `Org A` and `Org B`.
Assign `user_a` to `Org A` only via `organization_members`.
Assign `user_b` to `Org B` only via `organization_members`.

## 2. Verify Isolation

Run queries as `user_a`:

```sql
-- Simulate authentication as User A
SET request.jwt.claims TO '{"sub": "<USER_A_UUID>", "role": "authenticated"}';
SET role authenticated;

-- Test 1: Reading Organizations
-- Expected: Should only see 'Org A'.
SELECT name FROM organizations;

-- Test 2: Reading Products
-- Expected: Should only see products belonging to 'Org A'.
SELECT sku FROM products;

-- Test 3: Attempting to insert a product into Org B
-- Expected: Row-level security violation error.
INSERT INTO products (organization_id, sku, name) 
VALUES ('<ORG_B_UUID>', 'SKU-HACK', 'Hacked Product');

-- Test 4: Attempting to read another user's notification preferences
-- Expected: Returns 0 rows (only sees their own).
SELECT * FROM notification_preferences WHERE user_id = '<USER_B_UUID>';
```

## 3. Verify Auditing and Ledger Append-Only Behavior

```sql
-- Test 5: Attempting to modify historical ledger entries
-- Expected: Row-level security violation error.
UPDATE stock_ledger SET quantity_change = 9999 WHERE id = '<SOME_LEDGER_ID>';

-- Test 6: Attempting to delete an audit log
-- Expected: Row-level security violation error.
DELETE FROM audit_logs WHERE id = '<SOME_AUDIT_ID>';
```

## 4. Reset Session

```sql
-- Revert to admin for further setup
RESET role;
RESET request.jwt.claims;
```
