import { importTravelCsvFile } from "../lib/travel-csv";
import type { TravelCsvOptions, TravelCsvWorkerResponse } from "../lib/travel-csv";

// A dedicated worker per import also lets the editor cancel immediately with worker.terminate().
const context = self as unknown as {
  onmessage: (event: MessageEvent<{ file: File; options: TravelCsvOptions }>) => void;
  postMessage: (message: TravelCsvWorkerResponse) => void;
};

context.onmessage = async ({ data }) => {
  try {
    if (!(data.file instanceof Blob)) throw new Error("请选择有效的 CSV 文件。");
    const result = await importTravelCsvFile(data.file, data.options, (percent) => {
      context.postMessage({ type: "progress", percent });
    });
    context.postMessage({ type: "complete", ...result });
  } catch (error) {
    context.postMessage({ type: "error", error: error instanceof Error ? error.message : "CSV 导入失败，请检查文件后重试。" });
  }
};
