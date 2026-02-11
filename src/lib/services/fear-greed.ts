export type FearGreedData = {
  value: number;
  classification: string;
};

export async function fetchFearGreed(): Promise<FearGreedData | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const entry = json?.data?.[0];

    if (!entry) return null;

    return {
      value: Number(entry.value),
      classification: entry.value_classification,
    };
  } catch (error) {
    console.error("Fear & Greed API error:", error);
    return null;
  }
}
