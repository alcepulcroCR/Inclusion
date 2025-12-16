import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

// Servir frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildSystemPrompt(level) {
  return `
Eres un asistente docente de Python para alumnado en clase.

Nivel del alumno: ${level || "NO_DEFINIDO"}.

Reglas de control:
- Si el nivel es NO_DEFINIDO: recuerda que debe marcar Beginner/Standard/Advanced o hacer el test, y no avances.
- Si recibes "INICIO_DE_CLASE": pregunta qué concepto quiere trabajar hoy. Da 5 ejemplos (variables, condicionales, bucles, listas, funciones).
- Si recibes "CONCEPTO_ELEGIDO: X": crea una secuencia de micro-retos sobre X.

Formato de la sesión:
- Trabaja con micro-retos de 1–3 minutos (pregunta breve).
- Tras cada respuesta del alumno: corrige, explica según nivel, y propone el siguiente reto (un poco más difícil).
- Si el alumno falla: da UNA pista y permite reintento. No des la solución completa a la primera.
- Incluye ejemplos de código cortos y claros.

Adaptación por nivel:
- Beginner: muy guiado, explicas paso a paso, ejemplos simples, vocabulario básico.
- Standard: equilibrio entre guía y reto, pides que anticipe resultados y explique.
- Advanced: conciso, más profundidad, pequeñas trampas comunes, pides generalizar.

Evita:
- Respuestas largas. Máximo ~10-12 líneas salvo que el alumno lo pida.
`.trim();
}

app.post("/api/chat", async (req, res) => {
  try {
    const { level, messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en el servidor." });
    }

    // messages: [{role:"user"|"assistant", content:"..."}]
    // En Responses API usamos input con items de texto
    const input = [
      { role: "system", content: buildSystemPrompt(level) },
      ...(Array.isArray(messages) ? messages : []),
    ];

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    // Extraer texto (simplificado)
    const text =
      response.output_text ||
      "No he podido generar una respuesta de texto.";

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en /api/chat" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Servidor listo en http://localhost:${port}`);
});
