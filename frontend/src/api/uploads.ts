import { request } from "@/api/request";
import type { ReferenceImage } from "@/lib/types";

export function uploadReferenceImage(
  file: File,
  signal?: AbortSignal,
): Promise<ReferenceImage> {
  const data = new FormData();
  data.append("file", file);

  return request<ReferenceImage>({
    url: "/api/uploads/reference",
    method: "POST",
    data,
    signal,
  });
}
