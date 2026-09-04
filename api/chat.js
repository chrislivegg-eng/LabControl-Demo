const allowedOrigins = new Set([
  'https://chrislivegg-eng.github.io',
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'El asistente aun no esta configurado.' });

  const question = String(req.body?.question || '').trim().slice(0, 700);
  const activities = Array.isArray(req.body?.activities) ? req.body.activities.slice(0, 25) : [];
  if (!question) return res.status(400).json({ error: 'Escribe una pregunta para el asistente.' });

  const prompt = `Eres el asistente de LabControl, una demostracion escolar de Colegio Ciudadano.
Responde siempre en espanol, de forma breve, clara y respetuosa. Estos datos son ficticios.
Solo resume y clasifica la actividad en modulos como academico, navegacion, entretenimiento o alerta.
No inventes datos, no solicites contrasenas, mensajes, teclas ni contenido privado. Si la pregunta sale de este tema, dilo con amabilidad.

Actividad visible en el panel:
${JSON.stringify(activities)}

Pregunta del docente: ${question}`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'Gemini no pudo responder.');

    const reply = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!reply) throw new Error('Gemini no devolvio una respuesta.');
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'No fue posible consultar el asistente.' });
  }
};
