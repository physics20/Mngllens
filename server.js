const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGemini(parts) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

app.post('/api/scan', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType)
    return res.status(400).json({ error: 'imageBase64 болон mimeType шаардлагатай' });
  if (!GEMINI_KEY)
    return res.status(500).json({ error: 'GEMINI_API_KEY тохируулаагүй' });
  try {
    const text = await callGemini([
      { inline_data: { mime_type: mimeType, data: imageBase64 } },
      { text: `Энэ зурагт байгаа бүх монгол бичиг болон текстийг уншиж, дараах форматаар хариул:\n\nКИРИЛЛ: [Зурагт байгаа текстийн кирилл орчуулга. Монгол бичиг байвал кириллд хөрвүүл]\nUNICODE: [Зурагт байгаа монгол бичгийг Unicode монгол бичгийн кодоор бич]\nТАЙЛБАР: [Зурагт байгаа агуулга, контекст, нэмэлт тайлбар]\n\nХэрэв зурагт монгол бичиг байхгүй бол КИРИЛЛ талд "Монгол бичиг олдсонгүй" гэж бич.` }
    ]);
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
      text: `Монгол хэлний толь бичгийн туслагч. "${word}" гэдэг үгийг тайлбарла:\n1. Кирилл монгол дээр утгыг тайлбарла\n2. Уламжлалт монгол бичгийн Unicode бичиглэл\n3. Жишээ өгүүлбэр (кирилл дээр)\n4. Ижил утгатай үгс\n\nТовч, тодорхой хариул.`
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
