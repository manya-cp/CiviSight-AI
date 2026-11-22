# CIVISIGHT AI — Firestore Security Specification

## 1. Data Invariants
1. A user profile at `/users/{userId}` can only be created with `uid == request.auth.uid`, `role == 'citizen'`, and verified email (`request.auth.token.email_verified == true`), except when created by a verified administrator.
2. Self-escalation of `role` to `'admin'` on `/users/{userId}` or `/admins/{adminId}` is strictly forbidden for non-admin users.
3. A complaint at `/complaints/{complaintId}` must be owned by `request.auth.uid` on creation, use server timestamps (`request.time`), and start with status `'Submitted'` or `'AI Analysed'`.
4. List queries on `/complaints`, `/statusHistory`, and `/verifications` must never perform `get()` or `exists()` lookups and must enforce `resource.data.userId == request.auth.uid` (or `complaintUserId == request.auth.uid`) unless the caller is the verified bootstrapped administrator.
5. `statusHistory` and `verifications` records require `exists()` verification on the parent `/complaints/{complaintId}` document.
6. Terminal state locking: once a complaint reaches `status == 'Verified'`, only an administrator can modify it.
7. All string fields enforce explicit `.size()` bounds; all IDs match `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Role Self-Escalation on Register**: `setDoc(/users/u1, { ..., role: 'admin' })` as non-admin -> `PERMISSION_DENIED`.
2. **Ghost Field Shadow Write**: `setDoc(/complaints/CIV-1, { ..., isVerified: true })` -> `PERMISSION_DENIED`.
3. **Spoofed Complaint Owner**: `setDoc(/complaints/CIV-2, { ..., userId: 'victim_uid' })` -> `PERMISSION_DENIED`.
4. **Oversized ID Poisoning**: `setDoc(/complaints/<2000_chars>, ...)` -> `PERMISSION_DENIED`.
5. **Client Timestamp Forgery**: `setDoc(/complaints/CIV-3, { ..., createdAt: new Date('2020-01-01') })` -> `PERMISSION_DENIED`.
6. **Unverified Email Spoofing**: Request with `email: 'manyacp2@gmail.com'` and `email_verified: false` -> `PERMISSION_DENIED`.
7. **PII Cross-User Read**: Citizen A calls `getDoc(/users/citizenB)` -> `PERMISSION_DENIED`.
8. **Blanket List Query Scraping**: Citizen A calls `getDocs(collection(db, 'complaints'))` without `where('userId', '==', citizenA.uid)` -> `PERMISSION_DENIED`.
9. **Unauthorized Admin Status Override**: Citizen A calls `updateDoc(/complaints/CIV-1, { status: 'Resolved', assignedDepartment: 'Public Works' })` -> `PERMISSION_DENIED`.
10. **Terminal State Mutation**: Citizen A updates `/complaints/CIV-1` after `status == 'Verified'` -> `PERMISSION_DENIED`.
11. **Orphaned Verification Write**: `setDoc(/verifications/VER-1, { complaintId: 'NON_EXISTENT', ... })` -> `PERMISSION_DENIED`.
12. **Array Type Poisoning**: `setDoc(/complaints/CIV-4, { ..., recommendations: [12345] })` -> `PERMISSION_DENIED`.
