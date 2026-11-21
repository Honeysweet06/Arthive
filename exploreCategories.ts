export type ExploreSubcategory = {
  slug: string
  title: string
  description: string
  image: string
  matches: string[]
}

export type ExploreCollection = {
  slug: 'artworks' | 'literature' | 'essays' | 'sculptures'
  title: string
  description: string
  image: string
  subcategories: ExploreSubcategory[]
}

const subcategory = (
  slug: string,
  title: string,
  description: string,
  _folder: string,
  matches: string[] = [title],
): ExploreSubcategory => ({
  slug,
  title,
  description,
  image: authenticCategoryImage(slug),
  matches,
})

const authenticCategoryImages: Record<string, string> = {
  paintings: '/assets/images/artworks/met-collection/paintings/met-436531-peasant-woman-cooking-by-a-fireplace.jpg',
  'traditional-art': '/assets/images/artworks/met-collection/traditional-cultural/met-49936-bamboo-hedge-at-kumemura-kumemura-chikuri-from-the-series-eight-views-of-the-ryukyu-islands-ryukyu-hakkei.jpg',
  'digital-art': '/assets/images/artworks/met-collection/paintings/met-437429-still-life-with-peaches.jpg',
  'masterpiece-drawings': '/assets/images/artworks/met-collection/drawings/met-459211-head-of-a-young-woman.jpg',
  illustrations: '/assets/images/artworks/met-collection/drawings/met-370468-study-sheet-with-three-women-and-a-boy.jpg',
  portraits: '/assets/images/artworks/met-collection/paintings/met-436820-serena-pulitzer-lederer-1867-1943.jpg',
  'landscape-art': '/assets/images/artworks/met-collection/paintings/met-438849-landscape.jpg',
  'abstract-art': '/assets/images/artworks/met-collection/paintings/met-51776-painting.jpg',
  'contemporary-art': '/assets/images/artworks/met-collection/paintings/met-436305-still-life.jpg',
  'classical-art': '/assets/images/artworks/met-collection/paintings/met-49099-famous-themes-for-painting-study-known-as-the-garden-of-painting-gaen.jpg',
  photography: '/assets/images/artworks/met-collection/photography-decorative/met-302000-young-woman-with-beckers-tabletop-stereoscope.jpg',
  'mixed-media': '/assets/images/artworks/met-collection/photography-decorative/met-208152-vase.jpg',
  'cultural-art': '/assets/images/artworks/met-collection/traditional-cultural/met-463022-textile.jpg',
  'classical-sculptures': '/assets/images/artworks/met-collection/sculptures/met-191807-beside-the-sea.jpg',
  'contemporary-sculptures': '/assets/images/artworks/met-collection/sculptures/met-449853-sculpture.jpg',
  'abstract-sculptures': '/assets/images/artworks/met-collection/sculptures/met-500016-sculpture.jpg',
  'figurative-sculptures': '/assets/images/artworks/met-collection/sculptures/met-325064-bird-sculpture.jpg',
  'wood-sculptures': '/assets/images/artworks/met-collection/sculptures/met-325064-bird-sculpture.jpg',
  'stone-sculptures': '/assets/images/artworks/met-collection/sculptures/met-191807-beside-the-sea.jpg',
  'metal-sculptures': '/assets/images/artworks/met-collection/photography-decorative/met-205482-vase-vase-indien.jpg',
  'clay-ceramic-sculptures': '/assets/images/artworks/met-collection/photography-decorative/met-208152-vase.jpg',
  'marble-sculptures': '/assets/images/artworks/met-collection/sculptures/met-191807-beside-the-sea.jpg',
  'cultural-sculptures': '/assets/images/artworks/met-collection/traditional-cultural/met-448602-textile.jpg',
  'installation-art': '/assets/images/artworks/met-collection/sculptures/met-500016-sculpture.jpg',
  'miniature-sculptures': '/assets/images/artworks/met-collection/sculptures/met-449853-sculpture.jpg',
}

function authenticCategoryImage(slug: string): string {
  return authenticCategoryImages[slug]
    ?? '/assets/images/artworks/met-collection/paintings/met-436531-peasant-woman-cooking-by-a-fireplace.jpg'
}

export const exploreCollections: ExploreCollection[] = [
  {
    slug: 'artworks',
    title: 'Artworks',
    description: 'Paintings, drawings, photography, and creative practices from many perspectives.',
    image: '/assets/images/artworks/artworks-collection.jpg',
    subcategories: [
      subcategory('paintings', 'Paintings', 'Original painted works, from quiet studies to bold compositions.', 'artworks', ['painting', 'paintings']),
      subcategory('traditional-art', 'Traditional Art', 'Handmade practices and material-led work, shared with creator context.', 'artworks', ['traditional art', 'traditional']),
      subcategory('digital-art', 'Digital Art', 'Images and compositions created with digital tools.', 'artworks', ['digital art', 'digital']),
      subcategory('masterpiece-drawings', 'Masterpiece Drawings', 'Selected drawings and studies, with provenance where available.', 'artworks', ['masterpiece drawings', 'drawing', 'drawings']),
      subcategory('illustrations', 'Illustrations', 'Visual storytelling, editorial images, and imaginative studies.', 'artworks', ['illustration', 'illustrations']),
      subcategory('editorial-illustrations', 'Editorial Illustration', 'Illustrated commentary and visual storytelling for editorial subjects.', 'artworks', ['editorial illustration', 'drawing', 'illustration']),
      subcategory('book-illustrations', 'Book Illustrations', 'Illustrations associated with books, printed pages, and literary objects.', 'artworks', ['book illustration', 'illustration', 'print']),
      subcategory('botanical-illustrations', 'Botanical Illustrations', 'Plant, flower, and botanical studies recorded through historical media.', 'artworks', ['botanical', 'plant', 'flower', 'flora']),
      subcategory('character-illustrations', 'Character Illustrations', 'Illustrations emphasizing identifiable figures and character studies.', 'artworks', ['portrait', 'figure', 'character', 'woman', 'man']),
      subcategory('fantasy-illustrations', 'Fantasy Illustrations', 'Illustrated mythic, imaginary, and fantastical subjects.', 'artworks', ['fantasy', 'myth', 'mythology', 'legend']),
      subcategory('historical-illustrations', 'Historical Illustrations', 'Illustrated records of historical people, places, and events.', 'artworks', ['historical illustration', 'history', 'historical']),
      subcategory('scientific-illustrations', 'Scientific Illustrations', 'Studies of natural specimens and visual scientific documentation.', 'artworks', ['scientific illustration', 'diagram', 'anatomy', 'botanical']),
      subcategory('decorative-illustrations', 'Decorative Illustrations', 'Patterned, ornamental, and decorative visual studies.', 'artworks', ['decorative', 'ornament', 'pattern', 'textile']),
      subcategory('concept-illustrations', 'Concept Illustrations', 'Compositional studies exploring an idea, pose, or visual concept.', 'artworks', ['concept', 'study', 'composition', 'design']),
      subcategory('contemporary-illustrations', 'Contemporary Illustrations', 'Modern and contemporary illustrated visual culture.', 'artworks', ['contemporary illustration', 'contemporary', 'modern']),
      subcategory('portraits', 'Portraits', 'Works centered on people, likeness, and expression.', 'artworks', ['portrait', 'portraits']),
      subcategory('landscape-art', 'Landscape Art', 'Places, horizons, gardens, and imagined environments.', 'artworks', ['landscape art', 'landscape']),
      subcategory('abstract-art', 'Abstract Art', 'Shape, color, and gesture-led compositions.', 'artworks', ['abstract art', 'abstract']),
      subcategory('contemporary-art', 'Contemporary Art', 'Current practices and perspectives from living creative communities.', 'artworks', ['contemporary art', 'contemporary']),
      subcategory('classical-art', 'Classical Art', 'Classical approaches and documented historical works.', 'artworks', ['classical art', 'classical']),
      subcategory('photography', 'Photography', 'Photographic studies, portraits, and visual documents.', 'artworks', ['photography', 'photograph']),
      subcategory('mixed-media', 'Mixed Media', 'Works bringing more than one medium or process together.', 'artworks', ['mixed media', 'mixed-media']),
      subcategory('cultural-art', 'Cultural Art', 'Culturally grounded creative work, presented with context and care.', 'artworks', ['cultural art', 'cultural', 'heritage']),
    ],
  },
  {
    slug: 'literature',
    title: 'Literature',
    description: 'Poetry, stories, and literary works shared by their authors.',
    image: '/assets/images/literature/literature-collection.jpg',
    subcategories: [
      subcategory('novels', 'Novels', 'Long-form fiction and narrative writing.', 'literature', ['novel', 'novels']),
      subcategory('poetry', 'Poetry', 'Poetic works, collections, and verse.', 'literature', ['poetry']),
      subcategory('poems', 'Poems', 'Individual poems and short-form verse.', 'literature', ['poem', 'poems']),
      subcategory('short-stories', 'Short Stories', 'Compact fiction and short narrative forms.', 'literature', ['short story', 'short stories', 'fable', 'fables']),
      subcategory('folklore', 'Folklore', 'Community stories and oral traditions, with attribution where available.', 'literature', ['folklore', 'folk tale', 'folktale']),
      subcategory('legends', 'Legends', 'Legendary narratives and retellings.', 'literature', ['legend', 'legends']),
      subcategory('fables', 'Fables', 'Brief tales and fables, including original writing.', 'literature', ['fable', 'fables']),
      subcategory('myths', 'Myths', 'Mythic narratives and interpretations.', 'literature', ['myth', 'myths', 'mythology']),
      subcategory('literary-masterpieces', 'Literary Masterpieces', 'Notable works and editions with reliable publication details.', 'literature', ['literary masterpiece', 'masterpiece']),
      subcategory('historical-literature', 'Historical Literature', 'Literature placed in its historical context.', 'literature', ['historical literature', 'historical']),
      subcategory('creative-writing', 'Creative Writing', 'Original prose, poetry, and experimental writing.', 'literature', ['creative writing']),
      subcategory('anthologies', 'Anthologies', 'Collections bringing multiple works or voices together.', 'literature', ['anthology', 'anthologies']),
    ],
  },
  {
    slug: 'essays',
    title: 'Essays',
    description: 'Research, criticism, reflection, and personal perspectives.',
    image: '/assets/images/essays/essays-collection.jpg',
    subcategories: [
      subcategory('academic-essays', 'Academic Essays', 'Scholarly writing with citations and research context.', 'essays', ['academic essay', 'academic']),
      subcategory('literary-essays', 'Literary Essays', 'Writing about literature, language, and reading.', 'essays', ['literary essay', 'literary']),
      subcategory('historical-essays', 'Historical Essays', 'Essays exploring documented histories and their sources.', 'essays', ['historical essay', 'historical']),
      subcategory('cultural-essays', 'Cultural Essays', 'Thoughtful writing about culture and creative practice.', 'essays', ['cultural essay', 'cultural']),
      subcategory('philosophical-essays', 'Philosophical Essays', 'Questions, ideas, and arguments in philosophical writing.', 'essays', ['philosophical essay', 'philosophical']),
      subcategory('personal-essays', 'Personal Essays', 'First-person perspectives and lived experience.', 'essays', ['personal essay', 'personal']),
      subcategory('critical-essays', 'Critical Essays', 'Close analysis, interpretation, and critique.', 'essays', ['critical essay', 'critical']),
      subcategory('reflective-essays', 'Reflective Essays', 'Reflective writing about experience, practice, and learning.', 'essays', ['reflective essay', 'reflective', 'reflection']),
      subcategory('social-commentary', 'Social Commentary', 'Essays examining social life and public ideas.', 'essays', ['social commentary', 'commentary']),
      subcategory('art-criticism', 'Art Criticism', 'Critical perspectives on visual art and exhibitions.', 'essays', ['art criticism', 'criticism']),
      subcategory('research-based-essays', 'Research-Based Essays', 'Evidence-led essays with source context.', 'essays', ['research-based essay', 'research based', 'research']),
      subcategory('creative-nonfiction', 'Creative Nonfiction', 'Literary nonfiction grounded in real experience.', 'essays', ['creative nonfiction', 'nonfiction']),
    ],
  },
  {
    slug: 'sculptures',
    title: 'Sculptures',
    description: 'Three-dimensional works, materials, and installation practices.',
    image: '/assets/images/sculptures/sculptures-collection.jpg',
    subcategories: [
      subcategory('classical-sculptures', 'Classical Sculptures', 'Classical sculptural traditions and documented objects.', 'sculptures', ['classical sculpture', 'classical']),
      subcategory('contemporary-sculptures', 'Contemporary Sculptures', 'Sculptural work and installation in contemporary practice.', 'sculptures', ['contemporary sculpture', 'contemporary']),
      subcategory('abstract-sculptures', 'Abstract Sculptures', 'Sculptural forms that explore shape, space, and material.', 'sculptures', ['abstract sculpture', 'abstract']),
      subcategory('figurative-sculptures', 'Figurative Sculptures', 'Three-dimensional studies of the human or animal figure.', 'sculptures', ['figurative sculpture', 'figurative']),
      subcategory('wood-sculptures', 'Wood Sculptures', 'Carved, assembled, and shaped works in wood.', 'sculptures', ['wood sculpture', 'wood']),
      subcategory('stone-sculptures', 'Stone Sculptures', 'Sculptural studies in stone and related materials.', 'sculptures', ['stone sculpture', 'stone']),
      subcategory('metal-sculptures', 'Metal Sculptures', 'Form and structure in metalwork.', 'sculptures', ['metal sculpture', 'metal']),
      subcategory('clay-ceramic-sculptures', 'Clay and Ceramic Sculptures', 'Sculptural forms in clay and ceramic.', 'sculptures', ['clay and ceramic', 'ceramic sculpture', 'clay']),
      subcategory('marble-sculptures', 'Marble Sculptures', 'Sculptural work in marble, with material details when known.', 'sculptures', ['marble sculpture', 'marble']),
      subcategory('cultural-sculptures', 'Cultural Sculptures', 'Culturally grounded sculptural work shown with creator context.', 'sculptures', ['cultural sculpture', 'cultural']),
      subcategory('installation-art', 'Installation Art', 'Spatial works and installations.', 'sculptures', ['installation art', 'installation']),
      subcategory('miniature-sculptures', 'Miniature Sculptures', 'Small-scale sculptural objects and studies.', 'sculptures', ['miniature sculpture', 'miniature']),
    ],
  },
]

export function getExploreCollection(slug: string) {
  return exploreCollections.find((collection) => collection.slug === slug)
}

export function getExploreSubcategory(collection: ExploreCollection, slug: string) {
  return collection.subcategories.find((item) => item.slug === slug)
}
