export interface Page {
  id: string;
  title_uk: string;
  title_ru: string | null;
  slug: string;
  content_uk: string | null;
  content_ru: string | null;
  meta_title_uk: string | null;
  meta_title_ru: string | null;
  meta_description_uk: string | null;
  meta_description_ru: string | null;
  status: 'draft' | 'published' | 'archived';
  template: string;
  position: number;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
