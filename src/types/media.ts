export interface MediaAsset {
  id: string;
  entity_type: string;
  entity_id: string;
  storage_path: string;
  url: string;
  filename: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  alt_uk: string | null;
  alt_ru: string | null;
  position: number;
  is_main: boolean;
  created_at: string;
}
