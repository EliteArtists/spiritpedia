// Run with `npm test` (node --test). The account page's "Account type".
import test from 'node:test';
import assert from 'node:assert/strict';
import { accountTypeLabel } from './accountType.js';

test('an explorer, or a declined applicant, reads Explorer', () => {
  assert.equal(accountTypeLabel({ userType: 'explorer' }), 'Explorer');
  assert.equal(accountTypeLabel({ userType: 'explorer', status: 'rejected' }), 'Explorer');
  assert.equal(accountTypeLabel({}), 'Explorer');
});

test('before approval, or approved with no listing yet, reads awaiting approval', () => {
  assert.equal(accountTypeLabel({ userType: 'practitioner', status: 'pending' }), 'Practitioner (awaiting approval)');
  assert.equal(accountTypeLabel({ userType: 'practitioner', status: 'approved' }), 'Practitioner (awaiting approval)');
});

test('after approval it reads the type set at approval, never the sign-up wording', () => {
  const approved = { userType: 'practitioner', status: 'approved', healerSlug: 'x' };
  assert.equal(accountTypeLabel({ ...approved, entityType: 'individual' }), 'Practitioner');
  assert.equal(accountTypeLabel({ ...approved, entityType: null }), 'Practitioner');
  assert.equal(accountTypeLabel({ ...approved, entityType: 'channel' }), 'Channel');
  assert.equal(accountTypeLabel({ ...approved, entityType: 'app' }), 'App');
  assert.equal(accountTypeLabel({ ...approved, entityType: 'organisation' }), 'Organisation');
  assert.equal(accountTypeLabel({ userType: 'practitioner', status: 'approved', publisherId: 'p1' }), 'Publisher');
});
