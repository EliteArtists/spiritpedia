import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/account/account_service.dart';

void main() {
  String label({
    String userType = 'practitioner',
    String? status = 'approved',
    String? slug,
    String? publisherId,
    String? entityType,
  }) => AccountProfile(
    userType: userType,
    verificationStatus: status,
    linkedHealerSlug: slug,
    linkedPublisherId: publisherId,
    listingEntityType: entityType,
  ).typeLabel;

  test('an explorer, or a declined applicant, reads Explorer', () {
    expect(label(userType: 'explorer', status: null), 'Explorer');
    expect(label(userType: 'explorer', status: 'rejected'), 'Explorer');
  });

  test('before approval, or approved with no listing yet', () {
    expect(label(status: 'pending'), 'Practitioner (awaiting approval)');
    expect(label(), 'Practitioner (awaiting approval)');
  });

  test('after approval, the type set at approval', () {
    expect(label(slug: 'x', entityType: 'individual'), 'Practitioner');
    expect(label(slug: 'x'), 'Practitioner');
    expect(label(slug: 'x', entityType: 'channel'), 'Channel');
    expect(label(slug: 'x', entityType: 'app'), 'App');
    expect(label(slug: 'x', entityType: 'organisation'), 'Organisation');
    expect(label(publisherId: 'p1'), 'Publisher');
  });
}
