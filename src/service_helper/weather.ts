const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE = "https://api.openweathermap.org/data/2.5/weather";

export async function makeNWSRequest(city: string) {
  try {
    const res = await fetch(`${BASE}?q=${encodeURIComponent(city)},IN&appid=${API_KEY}&units=metric`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}


export async function addTwoNumber(x: number, y: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(x + y);
    }, 1000);
  });
}
