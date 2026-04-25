const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGemini(contents) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

app.post('/api/scan', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 шаардлагатай' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY тохируулаагүй' });
  try {
    const text = await callGemini([{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: `Энэ зурагт байгаа бүх монгол бичиг болон текстийг уншиж, дараах форматаар хариул:\n\nКИРИЛЛ: [кирилл орчуулга]\nUNICODE: [Unicode монгол бичиг]\nТАЙЛБАР: [агуулга, тайлбар]` }
      ]
    }]);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dict', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Үг шаардлагатай' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY тохируулаагүй' });
  try {
    const text = await callGemini([{
      role: 'user',
      parts: [{ text: `Монгол хэлний толь бичгийн туслагч. "${word}" гэдэг үгийг тайлбарла:\n1. Кирилл монгол дээр утгыг тайлбарла\n2. Уламжлалт монгол бичгийн Unicode\n3. Жишээ өгүүлбэр\n4. Ижил утгатай үгс` }]
    }]);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ МонголLens: http://localhost:${PORT}`);
  console.log(GEMINI_KEY ? '🟢 Gemini key олдлоо' : '🔴 GEMINI_API_KEY байхгүй!');
});
