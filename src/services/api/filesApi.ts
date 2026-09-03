import { apiGet, apiPost } from './client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4300/api';

export interface FileMeta {
  id: number;
  purpose_cd: string;
  ref_tx?: string;
  file_nm?: string;
  mime_tx?: string;
  size_bytes?: number;
  sts_cd: string;
  i_ts: string;
}

/** Read a File as a base64 data-URL for upload. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Central file store. Every upload lands in one of two tables (chosen server-side
 * by mime): images → image_lst_t, everything else → document_lst_t.
 */
export const filesApi = {
  /** Upload a data-URL. `purpose` maps the file to its use (e.g. `kyc_pan`). */
  upload: (purpose: string, dataUrl: string, fileName?: string, ref?: string) =>
    apiPost<{ kind: 'image' | 'document'; id: number } & FileMeta>('/files/upload', { purpose, data: dataUrl, fileName, ref }),
  /** Upload straight from a File object. */
  uploadFile: async (purpose: string, file: File, ref?: string) =>
    filesApi.upload(purpose, await readAsDataUrl(file), file.name, ref),
  images: (purpose?: string) => apiGet<FileMeta[]>('/files/images', purpose ? { params: { purpose } } : undefined),
  documents: (purpose?: string) => apiGet<FileMeta[]>('/files/documents', purpose ? { params: { purpose } } : undefined),
  /**
   * A stable, shareable URL to the raw bytes — usable in <img src>, a download link,
   * or persisted alongside a record. It carries a file-scoped capability signature
   * (`?fsig=`), NOT your JWT — so the token never leaks into stored URLs / logs, and
   * the link doesn't break when the token expires. Requires one round-trip to sign.
   */
  signedUrl: async (kind: 'image' | 'document', id: number): Promise<string> => {
    const { fsig } = await apiGet<{ fsig: string }>(`/files/${kind}/${id}/sign`);
    return `${API_BASE}/files/${kind}/${id}/raw?fsig=${encodeURIComponent(fsig)}`;
  },
};
