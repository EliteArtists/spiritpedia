// The website's cases (web/utils/affiliate.test.mjs) — real books.amazon_url
// values, with their book ids. The tags here are fixtures.

import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/affiliate/amazon.dart';

const _live = {'AMAZON_TAG_US': 'us-tag-20', 'AMAZON_TAG_UK': 'uk-tag-21'};
const _none = <String, String>{};

void main() {
  test('book 10 — .com with ref_/th/psc/dib cruft is rebuilt and tagged', () {
    const raw =
        'https://www.amazon.com/Ask-Given-Learning-Manifest-Attraction-ebook/dp/B00DJ735O4?ref_=ast_author_dp_rw&th=1&psc=1&dib=eyJ2IjoiMSJ9.CtcZ3&dib_tag=AUTHOR';
    expect(amazonAffiliateUrl(raw, tags: _live), (
      url: 'https://www.amazon.com/dp/B00DJ735O4?tag=us-tag-20',
      tagged: true,
    ));
  });

  test('book 9 — clean .com URL gets the US tag', () {
    expect(
      amazonAffiliateUrl(
        'https://www.amazon.com/Oneness-All-Life-Inspirational-Selections/dp/0452296080',
        tags: _live,
      ),
      (url: 'https://www.amazon.com/dp/0452296080?tag=us-tag-20', tagged: true),
    );
  });

  test('book 14 — .co.uk with /ref= path gets the UK tag', () {
    const raw =
        'https://www.amazon.co.uk/Magic-Guitar-Book-Challenge-Code-ebook/dp/B084TVZ1SB/ref=sr_1_1?crid=3DG82TBZK7K0Y&keywords=The+magic+Guitar&sr=8-1';
    expect(amazonAffiliateUrl(raw, tags: _live), (
      url: 'https://www.amazon.co.uk/dp/B084TVZ1SB?tag=uk-tag-21',
      tagged: true,
    ));
  });

  test('book 915 — us.amazon.com is amazon.com', () {
    expect(
      amazonAffiliateUrl(
        'https://us.amazon.com/Human-Design-System-Ra-Uru/dp/1466480793',
        tags: _live,
      ),
      (url: 'https://www.amazon.com/dp/1466480793?tag=us-tag-20', tagged: true),
    );
  });

  test('book 283 — /gp/product/ is rebuilt as /dp/', () {
    expect(
      amazonAffiliateUrl(
        'https://www.amazon.com/gp/product/0307986950',
        tags: _live,
      ),
      (url: 'https://www.amazon.com/dp/0307986950?tag=us-tag-20', tagged: true),
    );
  });

  test('Goodreads URLs stored as amazon_url are rejected', () {
    expect(
      amazonAffiliateUrl(
        'https://www.goodreads.com/book/show/36425463-the-happy',
        tags: _live,
      ),
      isNull,
    );
  });

  test('book 633 — nine-character ASIN is rejected, and cannot borrow', () {
    for (final raw in [
      'https://www.amazon.com/dp/BFK6VHWVV',
      'https://www.amazon.com/dp/BFK6VHWVV/ref=x',
      'https://www.amazon.com/dp/BFK6VHWVVX1',
    ]) {
      expect(amazonAffiliateUrl(raw, tags: _live), isNull, reason: raw);
    }
  });

  test('known store without a tag: clean, untagged', () {
    expect(
      amazonAffiliateUrl(
        'https://www.amazon.de/dp/3442217695?psc=1',
        tags: _live,
      ),
      (url: 'https://www.amazon.de/dp/3442217695', tagged: false),
    );
    expect(
      amazonAffiliateUrl(
        'https://www.amazon.co.uk/dp/B084TVZ1SB/ref=sr_1_1',
        tags: _none,
      ),
      (url: 'https://www.amazon.co.uk/dp/B084TVZ1SB', tagged: false),
    );
    expect(
      amazonAffiliateUrl(
        'https://www.amazon.com/dp/0452296080',
        tags: {'AMAZON_TAG_US': '  '},
      )!.tagged,
      isFalse,
    );
  });

  test('unknown hosts and junk are rejected', () {
    for (final raw in [
      null,
      '',
      'not a url',
      'https://amzn.to/3abcdef',
      'https://www.amazon.nl/dp/0452296080',
      'https://evilamazon.com/dp/0452296080',
      'https://www.amazon.com/',
    ]) {
      expect(amazonAffiliateUrl(raw, tags: _live), isNull, reason: '$raw');
    }
  });
}
