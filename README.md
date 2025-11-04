# EchoMind

EchoMind is a minimalist mobile AI assistant that helps you capture voice notes, convert them to text, organise them into smart categories, and store them with contextual date and time.

## Project Structure

```
.
├── mobile/   # Expo React Native client
└── server/   # Express API + SQLite storage + OpenAI integration
```

## Features

- **One-tap capture** — a single floating button starts and stops high-quality voice recording.
- **Automatic AI processing** — the backend sends audio to Whisper for transcription and GPT for categorisation + scheduling detection.
- **Organised timeline** — notes are saved with category, summary, and extracted datetime, shown newest first.
- **Category filters** — light-weight pill filters to focus on Work, Home, Study, Reminder, or Idea.

## Getting Started

### Requirements

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) for running the mobile client locally.
- An OpenAI API key with access to Whisper and GPT models.

### Backend (server)

```bash
cd server
cp .env.example .env
# edit .env with your OpenAI key and optional settings
npm install
npm run dev
```

The server listens on `http://localhost:4000` by default. It stores notes in `server/data/echomind.db` using SQLite.

### Mobile app (Expo client)

```bash
cd mobile
npm install
npm start
```

Update `mobile/app.config.js` to point `ECHOMIND_API_URL` to your running backend if it's not on the default `http://localhost:4000`.

### API Overview

- `POST /notes` — multipart upload of an `audio` file. Returns the saved note and original transcript.
- `GET /notes?category=Work` — fetch stored notes, optionally filtered by category. Results are sorted from newest to oldest.
- `GET /health` — lightweight readiness check.

## Future Enhancements

- Scheduled push notifications for upcoming reminders.
- Text-to-speech confirmations.
- Sync integrations with Notion or calendar providers.

## License

MIT
