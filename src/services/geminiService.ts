export async function analyzeJournal(content: string, image?: string) {
  const response = await fetch('/api/ai/analyze-journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, image })
  });
  return response.json();
}

export async function identifyBiology(image: string) {
  const response = await fetch('/api/ai/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image })
  });
  return response.json();
}

export async function biologyChat(message: string, history: any[]) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  const data = await response.json();
  return data.text;
}

export async function optimizeImage(image: string) {
  const response = await fetch('/api/image/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image })
  });
  const data = await response.json();
  return data.image;
}
