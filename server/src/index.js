import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { promises as fsPromises, createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { saveNote, getNotes } from './db.js';

const app = express();
const port = process.env.PORT || 4000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ?? ['*'];
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const classificationSchema = z.object({
  category: z.enum(['Work', 'Home', 'Study', 'Reminder', 'Idea']),
  note: z.string(),
  datetime: z.string().datetime().nullable()
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/notes', (req, res) => {
  try {
    const { category } = req.query;
    const notes = getNotes({ category });
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

app.post('/notes', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'echomind-'));
  const filePath = path.join(tempDir, `${randomUUID()}.m4a`);

  try {
    await fsPromises.writeFile(filePath, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: process.env.WHISPER_MODEL || 'whisper-1',
      response_format: 'text'
    });

    const transcriptText = typeof transcription === 'string' ? transcription : transcription.text;

    const prompt = [
      'You are EchoMind, an assistant that organises short personal voice notes.',
      'Analyse the transcript and classify it into one of the categories: Work, Home, Study, Reminder, Idea.',
      'Infer a precise ISO-8601 date-time (YYYY-MM-DDThh:mm) if the note mentions a date and/or time.',
      'If you cannot find a future time, return null for datetime.',
      'Return a concise paraphrased note (max 120 chars) capturing the key action or thought.',
      'Respond strictly using the provided JSON schema.'
    ].join(' ');

    const classification = await openai.responses.parse({
      model: process.env.GPT_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Transcript:\n"""${transcriptText}"""` }
      ],
      schema: classificationSchema
    });

    const now = new Date().toISOString();

    const stored = saveNote({
      category: classification.category,
      note: classification.note,
      datetime: classification.datetime,
      createdAt: now
    });

    res.status(201).json({
      note: {
        ...stored,
        transcript: transcriptText
      }
    });
  } catch (error) {
    console.error('Error processing note:', error);
    res.status(500).json({ error: 'Failed to process note' });
  } finally {
    try {
      await fsPromises.rm(filePath, { force: true });
      await fsPromises.rm(path.dirname(filePath), { recursive: true, force: true });
    } catch (cleanupError) {
      if (cleanupError?.code !== 'ENOENT') {
        console.warn('Cleanup error:', cleanupError);
      }
    }
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`EchoMind server listening on port ${port}`);
});

