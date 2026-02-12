const photoTypeNames: Record<string, string> = {
  'main': 'main',
  'bottle': 'banka',
  'swatch': 'svotch',
  'nails': 'na-nigtiah',
  'palette': 'palitra',
};

export function buildPhotoPath(
  brandSlug: string,
  productSlug: string,
  type: string,
  index?: number,
): string {
  const typeName = photoTypeNames[type] || type;
  const suffix = index && index > 0 ? `-${index}` : '';
  return `products/${brandSlug}/${productSlug}/${typeName}${suffix}.jpg`;
}

export function getPublicImageUrl(storagePath: string): string {
  const host = process.env.NEXT_PUBLIC_IMAGE_HOST || 'https://img.shineshopb2b.com';
  return `${host}/${storagePath}`;
}

export function buildAltText(productName: string, type: string, brandName: string): string {
  const labels: Record<string, string> = {
    'main': '',
    'bottle': 'флакон',
    'swatch': 'свотч на типсі',
    'nails': 'на нігтях',
    'palette': 'палітра кольорів',
  };
  const label = labels[type] || '';
  return label ? `${productName} — ${label} | ${brandName}` : `${productName} | ${brandName}`;
}
