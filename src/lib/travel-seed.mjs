import exampleJourney from "../data/example-journey.json" with { type: "json" };

// A migration seed and a missing-table fallback, never reinserted by a read request.
export function initialTravel() {
  return {
    id: "example-journey", slug: "example-journey", shade: "#626262",
    visible: true, revision: 1, updatedAt: "2024-05-02T00:00:00.000Z",
    cover: {
      src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=88",
      alt: "湖泊与群山 · 示例照片", width: 2400, height: 1600,
    },
    journey: structuredClone(exampleJourney),
  };
}
