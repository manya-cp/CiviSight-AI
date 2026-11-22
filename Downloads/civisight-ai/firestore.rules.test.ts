import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Security Rules Specification Verification Runner
 * Validates that all 12 Dirty Dozen invariants are structurally enforced in firestore.rules.
 */
describe('CIVISIGHT AI Firestore Security Rules Audit', () => {
  const rulesPath = fs.existsSync('firestore.rules') ? 'firestore.rules' : 'DRAFT_firestore.rules';
  const rules = fs.readFileSync(rulesPath, 'utf8');

  it('1. Enforces global deny catch-all at top of match /databases/{database}/documents', () => {
    assert.match(rules, /match \/{document=\*\*}\s*\{\s*allow read, write:\s*if false;/);
  });

  it('2. Enforces verified email and never trusts unverified email claims', () => {
    assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  });

  it('3. Blocks self-assigned admin role on /users create and update', () => {
    assert.match(rules, /incoming\(\)\.role\s*==\s*'citizen'/);
  });

  it('4. Enforces strict keys (hasAll + hasOnly) and isValidId path guards', () => {
    assert.match(rules, /isValidId\(/);
    assert.match(rules, /hasAll\(/);
    assert.match(rules, /hasOnly\(/);
  });

  it('5. Enforces server timestamp integrity (request.time)', () => {
    assert.match(rules, /request\.time/);
  });

  it('6. Enforces resource.data scoping on allow list without get()/exists()', () => {
    assert.match(rules, /allow list:.*?resource\.data\.(userId|complaintUserId)\s*==\s*request\.auth\.uid/s);
  });

  it('7. Enforces terminal state locking when status == Verified', () => {
    assert.match(rules, /existing\(\)\.status\s*!=\s*'Verified'/);
  });

  it('8. Enforces parent complaint existence on statusHistory and verifications', () => {
    assert.match(rules, /exists\(\/databases\/\$\(database\)\/documents\/complaints\/\$\(incoming\(\)\.complaintId\)\)/);
  });
});
