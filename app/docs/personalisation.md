# Personalisation: what a person's choices change

Spiritpedia can be tailored in two ways, both optional:

- **More of**: subjects someone wants to see first.
- **Never show**: subjects someone would rather not see at all.

People choose them once at onboarding, straight after the first-launch intro,
and can change them any time in **Account → Tailor Spiritpedia** (also in the
menu). Both use the same picker: the five pillars, each opening into its
subjects, with "All of [pillar]" first.

If someone chooses nothing, or skips, **the app behaves exactly as it does for
everyone else.** Nothing on this page applies to them.

A subject can be in **More of** or **Never show**, never both.

---

## 1. More of: ranking, in three levels

Wherever something is ranked for a person, it goes in this order:

1. **Their subjects**: anything carrying a subject they chose.
2. **The rest of those pillars**: anything carrying another subject from the
   same pillar as one they chose.
3. **Everything else**, in its usual order.

Within each level the usual order is kept (newest first, best fit for a
pillar shelf, and so on). If two items are in level 1, the one carrying more of
their chosen subjects comes first.

**Ranking never hides anything.** It only changes the order; every item is
still there.

### Example

Someone chose only **Reiki** (in Emotional Healing).

1. Reiki first.
2. Then the rest of Emotional Healing: Energy Medicine, Quantum Touch,
   Self-Healing, Shadow Work, EFT Tapping, Breathwork and Conscious
   Relationships.
3. Then everything else.

### Where the ranking applies

| Place | What changes |
|---|---|
| **Discover: For You** | A new first shelf of teachers: level 1, then level 2, up to 20. Level 3 is not in it. |
| **Discover: every teacher shelf** (the billboard, Worldwide, Rising Voices, Practitioners Near You, Timeless Teachers, Explore These Channels) | Each is re-ordered by the three levels. The same teachers are on each shelf. |
| **Discover: the pill row** | The pillars holding their subjects come first, most chosen first. The pills themselves are unchanged. |
| **Videos and Books: the pillar shelves** | The shelves holding their subjects move to the top, straight after "New to Spiritpedia". Each pillar shelf, and the mixed shelf at the end, is re-ordered by the three levels. |
| **Spiritpedia Suggests** (search) | A small bonus: more for level 1 than level 2. It settles a close call between two relevant items, but never beats a title match and never suggests something irrelevant. |

### Never re-ordered by More of

- **"New to Spiritpedia"** on Videos and Books stays newest first.
- **Publishing Houses** keeps its order.
- **Explore More** sections (Free Resources, Courses & Programmes, Retreats &
  Live Events, Downloads & Audio, Memberships) keep their order. Retreats stay
  soonest first.
- **A chosen subject filter.** When someone picks a subject from the pills,
  they see that subject, in its usual order.
- **Search results** (names and titles) keep their order. Only Suggests is
  ranked.

---

## 2. Never show: what is hidden

### The rules

- **An item is hidden if any one of its subjects is hidden.** Items are
  videos, books, courses, retreats, downloads, memberships and free
  resources. For example, a video tagged *Death & the Afterlife* and
  *Shamanism* is hidden for someone who hid *Shamanism*.
- **A teacher, channel or publisher stays visible unless every subject they
  cover is hidden.** Their own items still follow the item rule, so a teacher's
  page can show the teacher but not some of their videos.
- **Something with no subjects is never hidden.**

### Where hiding applies

| Place | What is hidden |
|---|---|
| **Discover** | Teachers, channels and publishers whose every subject is hidden, on every shelf (For You and the billboard included). In Explore More, every item with a hidden subject. |
| **Videos and Books** | Every video or book with a hidden subject, on every shelf ("New to Spiritpedia" included). A pillar shelf left empty disappears. |
| **The pill row** | A hidden subject is left out of its pillar's list. A pillar whose every subject is hidden is left out of the row. |
| **A teacher's or publisher's page** | Their videos, books, courses and free resources with a hidden subject. |
| **A subject page** | Its items with a hidden subject. If the subject itself is hidden, the page says "You've hidden this subject. Show anyway?" and shows nothing until they tap it. |
| **Spiritpedia Suggests** | Never suggests an item with a hidden subject. |
| **Search: names and titles** | Hidden items are held back. If the search found any, a quiet note says "You've hidden this subject. Show anyway?", and one tap shows them for that search. |
| **Search: feelings** ("I feel lost") | Items with a hidden subject are left out, with no note: the person didn't ask for them by name. |

### Never hidden

- **The crisis intercept.** It runs first, on every keystroke, exactly as
  before. Hiding plays no part in it.
- **My Library.** Something saved stays saved and visible, even if one of its
  subjects is hidden later.
- **A page opened directly**, from a link, a notification, a share, My Library,
  or "Show anyway" in search. The page itself opens normally.
- **Reviews**, and anything on the website. The website does not use these
  choices yet.

---

## 3. Discover, before and after

Someone who chose **Reiki** (More of) and hid **Shamanism** (Never show).

| | Before (no choices) | After |
|---|---|---|
| 1 | Billboard | **For You**: Reiki teachers, then the rest of Emotional Healing *(new)* |
| 2 | Worldwide (Superhero) | Billboard: Reiki first, then Emotional Healing, then the rest |
| 3 | Rising Voices (Luminary) | Worldwide: the same order of levels |
| 4 | Practitioners Near You (Local Hero) | Rising Voices: likewise |
| 5 | Timeless Teachers (Ascended Masters) | Practitioners Near You: likewise |
| 6 | Publishing Houses | Timeless Teachers: likewise |
| 7 | Explore These Channels | Publishing Houses: **order unchanged** |
| 8 | Explore More | Explore These Channels: by the three levels |
| 9 | | Explore More: **order unchanged** |

In every row of "After", a teacher whose only subject is Shamanism is gone. A
teacher who covers Shamanism and anything else is still there. In Explore More,
every course, retreat, download, membership and free resource tagged Shamanism
is gone.

The pill row reads View All, **Emotional Healing**, Consciousness,
Manifestation & Creation, Mystical & Spiritual Exploration, Body & Energy.
Shamanism is missing from the Mystical & Spiritual Exploration list.

---

## 4. Where the choices are kept

- **On the phone, straight away**, so they work signed out.
- **In the account when signed in** (`user_interests`, migrations 0017 and
  0018), so they follow the person to a new phone. Choices made before signing
  in are attached at sign-in. If both the phone and the account have choices,
  **the account wins**.
- **Only the person can read or change them.** Nobody else can, and there is
  no admin access. They are never shared or used for advertising.
- **Signing out** clears them from the phone; they stay in the account.
  **Deleting the account** deletes them.

The rules in this document live in `lib/data/shelf_rules.dart`
(`interestLevel`, `byInterest`, `isHiddenItem`, `isHiddenTeacher`). Change both
together.
