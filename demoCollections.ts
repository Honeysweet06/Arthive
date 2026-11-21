export const demoArtworks = [
  {
    id: 90001,
    title: 'Harbor at First Light',
    artist: 'ArtHive Demonstration Collection',
    category: 'Painting',
    style: 'Contemporary landscape study',
    medium: 'Original vector illustration',
    image: '/assets/images/artworks/demo-harbor.svg',
    description: 'An original, fictional study of a quiet harbor at sunrise. Demonstration artwork; not a historical or cultural artifact.',
    demonstration: true,
  },
  {
    id: 90002,
    title: 'Orbit of Memory',
    artist: 'ArtHive Demonstration Collection',
    category: 'Digital Art',
    style: 'Geometric digital composition',
    medium: 'Original vector illustration',
    image: '/assets/images/artworks/demo-orbit.svg',
    description: 'An original geometric composition exploring movement and memory. Demonstration artwork.',
    demonstration: true,
  },
  {
    id: 90003,
    title: 'Garden Study',
    artist: 'ArtHive Demonstration Collection',
    category: 'Drawing',
    style: 'Botanical study',
    medium: 'Original vector illustration',
    image: '/assets/images/artworks/demo-garden.svg',
    description: 'An original botanical study made for demonstrating the local collection experience.',
    demonstration: true,
  },
  {
    id: 90004,
    title: 'Pattern Study',
    artist: 'ArtHive Demonstration Collection',
    category: 'Illustration',
    style: 'Contemporary pattern exercise',
    medium: 'Original vector illustration',
    image: '/assets/images/artworks/demo-weave.svg',
    description: 'A fictional contemporary pattern exercise. It is not presented as an authentic traditional design or artifact.',
    demonstration: true,
  },
]

export const demoLiterature = [
  {
    title: 'Tide Notes',
    author: 'ArtHive Demonstration Collection',
    type: 'Poetry',
    read: 'Original demo',
    image: '/assets/images/literature/demo-poetry.svg',
    preview: 'The morning folds its quiet sail; a line of light crosses the water, and the day begins again.',
    demonstration: true,
  },
  {
    title: 'Island Fables',
    author: 'ArtHive Demonstration Collection',
    type: 'Short Stories',
    read: 'Original demo',
    image: '/assets/images/literature/demo-fables.svg',
    preview: 'At the edge of a small island, a lantern keeper learned that every path home began with listening.',
    demonstration: true,
  },
]

export const demoEssays = [
  {
    id: 90101,
    title: 'Memory and Place',
    category: 'Cultural Reflection',
    cover_url: '/assets/images/essays/demo-memory.svg',
    abstract: 'A fictional short reflection on how familiar places hold personal memories. Demonstration writing, not academic research.',
    profiles: { display_name: 'ArtHive Demonstration Collection', avatar_url: null },
    demonstration: true,
  },
]

export const demoSculptures = [
  {
    id: 90201,
    title: 'Study in Form',
    category: 'Sculpture Study',
    description: 'An original stylized illustration of a sculptural form, created as demonstration content. It does not depict a real object or material.',
    sculpture_images: [{ image_url: '/assets/images/sculptures/demo-form.svg' }],
    profiles: { display_name: 'ArtHive Demonstration Collection', avatar_url: null },
    demonstration: true,
  },
]

export const demoCategories = [
  { id: 9001, name: 'Painting', kind: 'Art', image_url: '/assets/images/artworks/demo-harbor.svg' },
  { id: 9002, name: 'Digital Art', kind: 'Art', image_url: '/assets/images/artworks/demo-orbit.svg' },
  { id: 9003, name: 'Drawing', kind: 'Art', image_url: '/assets/images/artworks/demo-garden.svg' },
  { id: 9004, name: 'Illustration', kind: 'Art', image_url: '/assets/images/artworks/demo-weave.svg' },
  { id: 9005, name: 'Poetry', kind: 'Literature', image_url: '/assets/images/literature/demo-poetry.svg' },
  { id: 9006, name: 'Sculpture Study', kind: 'Sculpture', image_url: '/assets/images/sculptures/demo-form.svg' },
]
