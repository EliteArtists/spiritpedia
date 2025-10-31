# Spiritpedia

**A modern spiritual encyclopedia** bridging science and spirituality — featuring tools, teachings, and practices for raising consciousness.

## 🌍 Vision

Spiritpedia is not just a search engine or content hub — it's a personalised spiritual companion. Visitors can browse by topic (e.g. Law of Attraction, Reiki, Tai Chi), but the real value unlocks once a user creates an account and begins:

- Favouriting content
- Receiving custom notifications
- Saving quotes, books, and videos into pre-made thematic folders
- Connecting with local or online healers
- Tracking their spiritual journey over time

## 🧱 Core Modules

- **Inspirational Quotes** – Daily quotes, tagged by emotional states
- **Books** – Searchable archive of spiritual books, with subfolders like "Spiritual Classics", "Law of Attraction", "Science & Spirituality"
- **Videos** – Tagged video content from teachers like Hicks, Tolle, Dyer, Swan, Dispenza
- **Healers Directory** – Find local or online healers (Reiki, Sound Healing, EFT, etc.)
- **IAM Notifications** – Daily or weekly positive affirmations & reminders, filtered by emotion or topic
- **Spiritual Disciplines** – Pre-populated folders (e.g. Tai Chi, Homeopathy, Astrology, Quantum Healing, etc.) auto-filled as user favourites content
- **User Dashboard** – Overview of saved items, emotional trends, recent searches
- **Search Engine** – Users can type how they feel (e.g., “I feel lost”) and Spiritpedia returns content across quotes, books, videos, and practices

## 🧪 Tech Stack

| Functionality            | Tool(s)                |
|--------------------------|------------------------|
| Frontend Framework       | React + Tailwind       |
| Hosting                  | Vercel                 |
| Database & API           | Supabase (PostgreSQL, Auth, Realtime) |
| Auth & Profile Storage   | Supabase Auth + Relational Tables |
| Quotes, Videos, Books    | Supabase Tables + optional Airtable/Notion API |
| Notifications System     | IAM Engine (planned)   |

## 🔒 Access Stages

- **Visitor (Not Logged In)**: Can use search, see trending items, and preview quotes
- **Registered User**: Can favourite content, receive notifications, auto-save to pre-made folders, and unlock dashboard view

## 🗂 Folder System Logic

Every user receives a standard set of folders upon signup:

- **Books**
  - Law of Attraction
  - Spiritual Classics
  - Modern Works
  - Conscious Science
- **Videos**
  - Guided Teachings
  - Short Clips
  - Practices (e.g., breathwork, meditations)
- **Practices**
  - Tai Chi
  - Reiki
  - EFT
  - Homeopathy
  - Astrology
- **Quotes**
  - Saved Quotes (tagged by emotion or topic)

User can add their own folders, but this baseline ensures no one starts “empty.”

## 🚀 Status

- ✅ GitHub repo created
- ⬜ README completed
- ⬜ Initial commit of frontend code
- ⬜ Vercel & Supabase linked
- ⬜ MVP launch checklist started
