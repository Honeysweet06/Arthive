export const categoryMapping: Record<string, string> = {
  Paintings: 'painting',
  'Traditional Art': 'traditional art',
  'Digital Art': 'digital art',
  'Masterpiece Drawings': 'drawings',
  Illustrations: 'illustrations',
  Portraits: 'portrait',
  'Landscape Art': 'landscape',
  'Abstract Art': 'abstract',
  'Contemporary Art': 'contemporary art',
  'Classical Art': 'classical art',
  Photography: 'photograph',
  'Fine Art': 'fine art',
  'Cultural Art': 'cultural artifact',
  'Mixed Media': 'mixed media',
  Sculpture: 'sculpture',
  'Wood Sculpture': 'wood sculpture',
  'Stone Sculpture': 'stone sculpture',
  'Metal Sculpture': 'metalwork',
  'Clay and Ceramic Sculpture': 'ceramics',
  'Marble Sculpture': 'marble sculpture',
  'Classical Sculpture': 'classical sculpture',
  'Contemporary Sculpture': 'contemporary sculpture',
  'Abstract Sculpture': 'abstract sculpture',
  'Figurative Sculpture': 'figurative sculpture',
  'Cultural Sculpture': 'cultural sculpture',
  'Installation Art': 'installation art',
  'Miniature Sculpture': 'miniature sculpture',
}

export function metSearchQuery(category: string): string {
  return categoryMapping[category] ?? category
}
