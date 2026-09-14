import xinjiang from "../data/travel.json" with { type: "json" };

// A migration seed and a missing-table fallback, never reinserted by a read request.
export function initialTravel() {
  return {
    id: "xinjiang-2026", slug: "xinjiang-2026", shade: "#626262",
    visible: true, revision: 1, updatedAt: "2026-09-14T00:00:00.000Z",
    cover: {
      src: "https://img.ixzki.com/2026/07/01/28a0242a4ed34652af813c010bd9a23c.jpg",
      alt: "六月伊犁", width: 6000, height: 4500,
    },
    journey: structuredClone(xinjiang),
  };
}
