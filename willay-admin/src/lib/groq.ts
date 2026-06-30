// Servicio de IA — usa proxy de Vite para evitar CORS
const GROQ_API_KEY = "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";

export async function askGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    // En desarrollo usa el proxy de Vite (/groq-api → https://api.groq.com)
    const url = import.meta.env.DEV
      ? "/groq-api/openai/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Groq error:", res.status, err);
      return `Error ${res.status}: No se pudo conectar con la IA. Verifica la API key en console.groq.com`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No se pudo generar el análisis.";
  } catch (e) {
    console.error("Error Groq:", e);
    return "Error de conexión con la IA. Verifica tu internet.";
  }
}