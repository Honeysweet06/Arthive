import './style.css'
import { fetchDiscoveryData, isSupabaseConfigured, supabase } from './lib/supabase'
import {
  currentFirebaseUser,
  isFirebaseConfigured,
  observeFirebaseAuth,
  registerFirebaseAccount,
  resendFirebaseVerification,
  resetFirebasePassword,
  signInFirebaseAccount,
  signOutFirebaseAccount,
  synchronizeFirebaseAccount,
} from './lib/firebaseAuth'
import { fallbackImagePath, isAllowedImageReference, localImagePath } from './lib/localMedia'
import { getLocalRatingSummary, submitLocalRating } from './lib/localRatings'
import { exploreCollections, getExploreCollection, getExploreSubcategory } from './lib/exploreCategories'
import { fetchMetOpenAccessRecords, type MetOpenAccessRecord } from './lib/metOpenAccess'
import { fetchMetObjects } from './lib/metMuseumAPI'
import { metSearchQuery } from './lib/categoryMapping'
import { getFavorites, isFavorite, toggleFavorite } from './lib/favorites'
import {
  demoArtworks,
  demoEssays,
  demoLiterature,
  demoSculptures,
} from './lib/demoCollections'
import {
  loadAssistantConfig,
  loadAssistantHistory,
  loadAssistantSessions,
  saveAssistantSettings,
  sendAssistantFeedback,
  sendAssistantMessage,
  submitSupportRequest,
  type AssistantMessage,
  type AssistantResult,
} from './lib/aiAssistant'
import {
  loadFounderContent,
  saveFounderContacts,
  saveFounderProfile,
  saveFounderProjects,
  saveFounderSkills,
  type FounderContact,
  type FounderContent,
  type FounderProject,
} from './lib/founder'

type Artwork = {
  id: number
  title: string
  artist: string
  category: string
  image: string
  description?: string
  keywords?: string[]
  creationDate?: string
  medium?: string
  price?: number
  creatorImage?: string
  creatorBio?: string
  creatorPublic?: boolean
  creatorVerified?: boolean
  images?: string[]
  demonstration?: boolean
  style?: string
  dimensions?: string
  metRecord?: MetOpenAccessRecord
}

let artworks: Artwork[] = []
let metOpenAccessRecords: MetOpenAccessRecord[] = []
let literature: Array<{ id: number; title: string; author: string; type: string; read: string; image: string; authorImage?: string; authorBio?: string; authorPublic?: boolean; preview?: string; description?: string; content?: string; publicationDate?: string; keywords?: string[]; demonstration?: boolean }> = []
let essays: Array<Record<string, any>> = []
let sculptures: Array<Record<string, any>> = []
let exhibitions: Array<Record<string, any>> = []
let listings: Array<Record<string, any>> = []
let categories: Array<{ id: number; name: string; kind: string; image_url: string | null }> = []
let bestSellers: Array<Record<string, any>> = []

const app = document.querySelector<HTMLDivElement>('#app')!
document.addEventListener('error', (event) => {
  const image = event.target
  if (image instanceof HTMLImageElement && !image.dataset.fallback) {
    image.dataset.fallback = 'true'
    image.src = '/media-fallback.svg'
  }
}, true)

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#" aria-label="ArtHive home"><span class="brand-mark">AH</span><span><strong>ART</strong>HIVE</span></a>
    <nav class="main-nav" aria-label="Main navigation">
      <a href="#">Home</a><a href="#explore">Explore</a><a href="#museum">Museum</a><a href="#marketplace">Marketplace</a><a href="#exhibitions">Exhibitions</a><a href="#creators">Creators</a><a href="#founder">Profile</a><a href="#ai">ArtHive AI</a>
    </nav>
    <div class="header-actions">
      <button class="icon-button" id="searchButton" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg></button>
      <button class="text-button" id="signInButton">Sign in</button>
      <button class="menu-button" id="menuButton" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
  </header>

  <main id="homeScreen">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-content">
        <p class="eyebrow">A living archive of creative culture</p>
        <h1 id="hero-title">Where creativity<br><em>meets culture.</em></h1>
        <p class="hero-copy">Discover remarkable art, preserve cultural stories, and support the makers shaping our world.</p>
        <div class="hero-actions">
          <a class="primary-button" href="#museum">Explore the museum <span>→</span></a>
          <button class="watch-button" id="filmButton"><span class="play">▶</span> Watch our story</button>
        </div>
      </div>
      <div class="hero-art">
        <div class="hero-frame"><img src="/assets/images/banners/museum-hero.jpg" alt="A visitor viewing framed artwork in a gallery" fetchpriority="high"></div>
        <aside class="hero-note"><span>Featured collection</span><strong>Forms of Belonging</strong></aside>
      </div>
    </section>

    <section class="stats" aria-label="Museum statistics">
      <div><strong id="statArtworks">—</strong><span>Artworks</span></div><div><strong id="statCreators">—</strong><span>Verified creators</span></div><div><strong id="statListings">—</strong><span>Listings</span></div><div><strong id="statLiterature">—</strong><span>Publications</span></div>
    </section>

    <section class="founder-feature" id="aboutArtHive">
      <div class="founder-feature-mark" aria-hidden="true">AH</div>
      <div><p class="eyebrow">Founded and owned by Honeylyn A. Moreno</p><h2>Creativity, culture<br>and technology together.</h2><p>ArtHive is a developing digital museum and creative marketplace concept for discovering creative work and sharing cultural knowledge.</p></div>
      <a class="primary-button" href="#founder">Meet the Founder <span>→</span></a>
    </section>

    <section class="section category-section" id="categories">
      <div class="section-heading"><div><p class="eyebrow">Browse by collection</p><h2>Explore categories</h2></div></div>
      <div class="category-grid" id="categoryGrid"><p class="loading-state">Loading categories…</p></div>
    </section>

    <section class="section" id="museum">
      <div class="section-heading"><div><p class="eyebrow">Curated for discovery</p><h2>From the collection</h2></div><a class="arrow-link" href="#museum-grid">View all works <span>→</span></a></div>
      <div class="filters" role="group" aria-label="Artwork categories">${['All', 'Painting', 'Photography', 'Illustration', 'Sculpture', 'Digital Art', 'Drawing', 'Traditional Art', 'Portraits', 'Masterpiece Drawings', 'Contemporary Art', 'Historical Art', 'Architecture', 'Cultural Art', 'Decorative Arts'].map((item, i) => `<button class="${i === 0 ? 'active' : ''}" data-filter="${item}">${item}</button>`).join('')}</div>
      <div class="discovery-toolbar"><input id="artworkSearch" type="search" placeholder="Search title, artist, medium..." aria-label="Search artworks"><span id="artworkResultCount">0 results</span><select id="artworkSort" aria-label="Sort artworks"><option value="recommended">Recommended</option><option value="popular">Most Popular</option><option value="rated">Highest Rated</option><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="viewed">Most Viewed</option></select></div>
      <p class="demo-notice" id="demoArtworkNotice" hidden>Demonstration content: original sample illustrations with fictional attribution. They are not published or for sale; visitor ratings remain browser-local.</p>
      <div class="art-grid" id="museum-grid">
        ${artworks.slice(0, 4).map((art, i) => `<article class="art-card ${i === 0 ? 'art-card-large' : ''}" data-category="${art.category}">
          <button class="art-image" data-art="${art.id}" aria-label="View ${art.title}"><img src="${localImagePath(art.image)}" alt="${art.title} by ${art.artist}" loading="lazy"><span class="view-cue">View artwork</span></button>
          <div class="art-meta"><div><h3>${art.title}</h3><p>${art.artist}</p></div><span>${art.category}</span></div>
        </article>`).join('')}
      </div>
    </section>

    <section class="feature-band" id="exhibitions">
      <div class="feature-image"><img src="/assets/images/exhibitions/threads-of-identity.jpg" alt="Contemporary exhibition hall" loading="lazy"></div>
      <div class="feature-copy"><p class="eyebrow">Now exhibiting</p><h2>Threads of<br><em>Identity</em></h2><p>A cross-cultural exhibition tracing how cloth, ritual, migration, and memory shape the stories we carry.</p><div class="feature-details"><span>Nov 08 — Jan 26</span><span>East Gallery</span></div><button class="outline-button" id="exhibitionButton">Enter exhibition</button></div>
    </section>

    <section class="section literature-section" id="literature">
      <div class="section-heading"><div><p class="eyebrow">Words that endure</p><h2>Literary archive</h2></div><a class="arrow-link" href="#literature-grid">Explore literature <span>→</span></a></div>
      <div class="literature-toolbar"><input id="literatureSearch" type="search" placeholder="Search titles or authors"><select id="literatureSort" aria-label="Sort literature"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></div>
      <p class="demo-notice" id="demoLiteratureNotice" hidden>Demonstration content: original sample covers and short text created for this preview.</p>
      <div class="literature-grid" id="literature-grid">
        ${literature.map(item => `<article class="literature-card"><img src="${localImagePath(item.image)}" alt="" loading="lazy"><div><span>${item.type} · ${item.read} read</span><h3>${item.title}</h3><p>by ${item.author}</p><button class="read-link" data-story="${item.title}">Read preview <span>→</span></button></div></article>`).join('')}
      </div>
    </section>

    <section class="section marketplace-section" id="marketplace">
      <div class="section-heading"><div><p class="eyebrow">Collect with purpose</p><h2>Marketplace</h2></div><a class="arrow-link" href="#market-grid">Browse all listings <span>→</span></a></div>
      <div class="marketplace-controls">
        <label>Search<span><input id="marketSearch" type="search" placeholder="Title or artist"></span></label>
        <label>Period<select id="bestSellerPeriod"><option value="all_time">All-Time Best Sellers</option><option value="monthly">Monthly Best Sellers</option><option value="weekly">Weekly Best Sellers</option></select></label>
        <label>Price range<span class="range-fields"><input id="priceMin" type="number" min="0" placeholder="Min"><input id="priceMax" type="number" min="0" placeholder="Max"></span></label>
        <label>Gallery<select id="marketCategory"><option value="">All collections</option><option>Featured Artworks</option><option>Recently Added</option><option>Popular Artworks</option><option>Digital Art</option><option>Traditional Art</option><option>Paintings</option><option>Sculptures</option><option>Photography</option><option>Illustrations</option><option>Collector's Picks</option><option>Historical Masterpieces</option></select></label>
        <select id="marketSort" aria-label="Sort marketplace"><option value="recommended">Recommended</option><option value="best">Best Selling</option><option value="rated">Highest Rated</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="newest">Newest First</option></select>
        <button class="outline-button dark" id="resetMarketFilters">Reset filters</button>
      </div>
      <div class="market-grid" id="market-grid"><p class="loading-state">Loading listings…</p></div>
    </section>

    <section class="section best-seller-section" id="best-sellers">
      <div class="section-heading"><div><p class="eyebrow">Verified completed sales</p><h2>Best Sellers</h2></div></div>
      <div class="market-grid" id="bestSellerGrid"><p class="loading-state">Loading best sellers…</p></div>
    </section>

    <section class="creator-strip" id="creators"><div><p class="eyebrow">Creator community</p><h2>Make your work<br><em>part of culture.</em></h2></div><p>Build a verified portfolio, share your practice, and connect with collectors around the world.</p><div class="creator-actions"><button class="primary-button" id="joinButton">Join ArtHive <span>→</span></button><span class="media-deployment-note">Artwork images are bundled with each application release.</span></div></section>
    <section class="creator-directory section" id="creatorDirectory">
      <div class="section-heading"><div><p class="eyebrow">Public creator profiles</p><h2>Meet the makers</h2></div></div>
      <div id="creatorDirectoryGrid" class="creator-directory-grid"></div>
    </section>
  </main>

  <section class="collection-screen" id="collectionScreen" hidden>
    <div class="collection-screen-header">
      <a class="arrow-link" href="#explore">← Explore</a>
      <div><p class="eyebrow" id="collectionEyebrow">Museum collection</p><h1 id="collectionTitle">Collection</h1></div>
    </div>
    <div class="collection-controls">
      <input id="collectionSearch" type="search" placeholder="Search this collection">
      <select id="collectionCategory" aria-label="Filter by category"><option value="">All categories</option></select>
      <select id="collectionSort" aria-label="Sort collection"><option value="recommended">Recommended</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select>
      <button class="outline-button dark" id="resetCollectionFilters" type="button">Reset filters</button>
      <span id="collectionCount">0 results</span>
    </div>
    <nav id="collectionSubcategories" class="collection-subcategories" aria-label="Collection subcategories"></nav>
    <p class="demo-notice" id="demoCollectionNotice" hidden>Demonstration content only. Sample works are original local illustrations with fictional attribution and are not for sale. Any visitor rating is browser-local and not shared.</p>
    <div class="collection-grid" id="collectionGrid"></div>
  </section>

  <section class="favorites-screen" id="favoritesScreen" hidden>
    <div class="section-heading"><div><p class="eyebrow">Saved on this browser</p><h2>My favorites</h2></div></div>
    <div class="collection-grid" id="favoritesGrid"></div>
  </section>

  <section class="creator-screen" id="creatorScreen" hidden><div id="creatorProfileContent"></div></section>

  <section class="explore-screen" id="exploreScreen" hidden>
    <div class="explore-header"><p class="eyebrow">The complete museum</p><h1>Explore ArtHive</h1><p>Find artworks, literature, essays, and sculptures from the ArtHive collection.</p></div>
    <div class="explore-search">
      <label class="sr-only" for="exploreSearch">Search artworks, literature, essays, and sculptures</label>
      <input id="exploreSearch" type="search" placeholder="Search artworks, literature, essays..." autocomplete="off">
      <button id="clearExploreSearch" type="button" aria-label="Clear search">Clear</button>
    </div>
    <div id="exploreSearchResults" class="explore-search-results" aria-live="polite"></div>
    <h2 class="explore-collections-heading">Browse by collection</h2>
    <div class="explore-grid" id="exploreGrid"></div>
  </section>

  <section class="assistant-screen" id="assistantScreen" hidden aria-labelledby="assistantTitle">
    <aside class="assistant-sidebar">
      <a class="arrow-link" href="#explore">← Explore the museum</a>
      <button class="primary-button assistant-new-chat" id="assistantNewChat" type="button">New conversation <span>+</span></button>
      <h2>Recent conversations</h2>
      <div id="assistantSessions" class="assistant-sessions"><p>Sign in to save conversation history.</p></div>
      <button class="read-link assistant-support-link" id="assistantSupportOpen" type="button">Contact support →</button>
      <div id="assistantContact" class="assistant-contact"></div>
      <details id="assistantAdminPanel" class="assistant-admin-panel" hidden>
        <summary>Assistant settings</summary>
        <form id="assistantAdminForm">
          <label><input type="checkbox" name="enabled"> Enable the assistant</label>
          <label>Welcome message<textarea name="welcome" rows="3" maxlength="500" required></textarea></label>
          <label>Suggested questions (one per line)<textarea name="suggestions" rows="5" maxlength="1200"></textarea></label>
          <label>Model<input name="model" maxlength="80" required></label>
          <label>Requests per hour<input name="limit" type="number" min="1" max="200" required></label>
          <button class="primary-button" type="submit">Save settings</button>
          <p id="assistantAdminStatus" role="status"></p>
        </form>
      </details>
      <form id="assistantSupportForm" hidden>
        <label>Subject<input name="subject" required maxlength="160"></label>
        <label>How can we help?<textarea name="message" required maxlength="4000" rows="5"></textarea></label>
        <button class="primary-button" type="submit">Send support request</button>
        <p id="assistantSupportStatus" role="status"></p>
      </form>
    </aside>
    <div class="assistant-main">
      <header class="assistant-heading"><div><p class="eyebrow">Your museum guide</p><h1 id="assistantTitle">ArtHive AI</h1></div><span class="assistant-status" id="assistantStatus">Grounded in ArtHive records</span></header>
      <div id="assistantMessages" class="assistant-messages" aria-live="polite"></div>
      <div id="assistantSuggestions" class="assistant-suggestions"></div>
      <form id="assistantForm" class="assistant-form">
        <label class="sr-only" for="assistantInput">Ask ArtHive AI</label>
        <textarea id="assistantInput" name="message" rows="1" maxlength="2000" placeholder="Ask about artworks, literature, creators, or the marketplace..." required></textarea>
        <button class="primary-button" type="submit" aria-label="Send message">Send <span>→</span></button>
      </form>
      <p class="assistant-disclaimer">ArtHive AI uses published museum and marketplace records. It may make mistakes; verify important details.</p>
    </div>
  </section>

  <section class="founder-screen" id="founderScreen" hidden aria-labelledby="founderName">
    <div id="founderStatus" class="founder-load-status" role="status">Loading founder profile…</div>
    <div id="founderContent" hidden></div>
    <section class="founder-admin" id="founderAdmin" hidden>
      <div class="founder-admin-heading"><div><p class="eyebrow">Owner dashboard</p><h2>Manage founder profile</h2></div><span>Profile content uses the existing account-backed application. Manage image files through the local development asset tool.</span></div>
      <form id="founderProfileForm" class="founder-admin-form">
        <h3>Founder profile</h3>
        <label>Full name<input name="full_name" required maxlength="120"></label>
        <label>Position<input name="title" required maxlength="160"></label>
        <label>Education<input name="education" required maxlength="200"></label>
        <label>University<input name="university" required maxlength="200"></label>
        <label>Biography<textarea name="biography" rows="4" required maxlength="1600"></textarea></label>
        <label>Founder story<textarea name="founder_story" rows="4" required maxlength="1600"></textarea></label>
        <label>Professional interests (one per line)<textarea name="interests" rows="5"></textarea></label>
        <label>Professional aspirations (one per line)<textarea name="aspirations" rows="4"></textarea></label>
        <label>Local founder image path<input name="profile_image_path" placeholder="/assets/images/founder/founder-profile.jpg" pattern="/assets/images/.*"></label>
        <button class="primary-button" type="submit">Save profile</button><p role="status" id="founderProfileStatus"></p>
      </form>
      <form id="founderStatementsForm" class="founder-admin-form">
        <h3>Proposed vision and mission</h3>
        <label>Vision<textarea name="vision" rows="3" required maxlength="800"></textarea></label>
        <label>Mission<textarea name="mission" rows="3" required maxlength="800"></textarea></label>
        <label class="founder-approval"><input name="statements_approved" type="checkbox"> I approve these statements for publication</label>
        <button class="primary-button" type="submit">Save statements</button><p role="status" id="founderStatementsStatus"></p>
      </form>
      <form id="founderSkillsForm" class="founder-admin-form">
        <h3>Skills and learning status</h3>
        <p>One skill per line: <code>Skill | Learning, Developing, Practicing, or Exploring | Category</code></p>
        <label class="sr-only" for="founderSkillsInput">Skills and status</label><textarea id="founderSkillsInput" name="skills" rows="9"></textarea>
        <button class="primary-button" type="submit">Save skills</button><p role="status" id="founderSkillsStatus"></p>
      </form>
      <div class="founder-admin-form">
        <h3>Projects</h3><div id="founderProjectEditor" class="founder-project-editor"></div>
        <button class="outline-button dark" id="founderAddProject" type="button">Add project</button>
        <p role="status" id="founderProjectsStatus"></p>
      </div>
      <form id="founderContactsForm" class="founder-admin-form">
        <h3>Public contact links</h3><p>One link per line: <code>key | label | email or website | address</code></p>
        <label class="sr-only" for="founderContactsInput">Contact links</label><textarea id="founderContactsInput" name="contacts" rows="7"></textarea>
        <button class="primary-button" type="submit">Save contact links</button><p role="status" id="founderContactsStatus"></p>
      </form>
      <section class="founder-admin-form" id="localAssetManager">
        <h3>Local project image assets</h3>
        <p>Files are written only by the local development server into <code>public/assets/images</code>. Deployed previews cannot permanently upload to Vercel's bundled filesystem.</p>
        <label>Image category<select id="localAssetCategory"><option value="artworks">Artworks</option><option value="literature">Literature</option><option value="essays">Essays</option><option value="sculptures">Sculptures</option><option value="artists">Artists</option><option value="authors">Authors</option><option value="sellers">Sellers</option><option value="marketplace">Marketplace</option><option value="founder" selected>Founder</option><option value="exhibitions">Exhibitions</option><option value="banners">Banners</option></select></label>
        <label>Add image to project<input id="localAssetFile" type="file" accept="image/jpeg,image/png"></label>
        <img class="founder-upload-preview" id="localAssetPreview" alt="Selected local image preview" hidden>
        <p id="localAssetStatus" role="status"></p><div id="localAssetList"></div>
      </section>
    </section>
  </section>

  <footer><a class="brand footer-brand" href="#"><span class="brand-mark">AH</span><span><strong>ART</strong>HIVE</span></a><p>Where creativity meets culture and opportunity.<br><a href="#founder">Founded and owned by Honeylyn A. Moreno.</a></p><div class="footer-links"><a href="#aboutArtHive">About ArtHive</a><a href="#founder">Meet the Founder</a><a href="#museum">Museum</a><a href="#literature">Literature</a><a href="#marketplace">Marketplace</a><a href="#creators">For creators</a></div></footer>

  <nav class="app-bottom-nav" aria-label="Application navigation">
    <a href="#"><span aria-hidden="true">⌂</span><small>Home</small></a>
    <a href="#explore"><span aria-hidden="true">⌕</span><small>Explore</small></a>
    <a href="#museum"><span aria-hidden="true">⌂</span><small>Museum</small></a>
    <a href="#marketplace"><span aria-hidden="true">◇</span><small>Market</small></a>
    <a href="#favorites"><span aria-hidden="true">♡</span><small>Favorites</small></a>
    <button id="profileNavButton" type="button"><span aria-hidden="true">◎</span><small>Profile</small></button>
  </nav>

  <a class="assistant-launcher" id="assistantLauncher" href="#ai" aria-label="Ask ArtHive AI">Ask ArtHive AI <span>✦</span></a>
  <div class="overlay" id="searchOverlay" aria-hidden="true"><button class="overlay-close" data-close aria-label="Close search">×</button><form class="search-panel" id="searchForm"><label for="searchInput">Search ArtHive</label><div><input id="searchInput" type="search" placeholder="Artwork, artist, collection..."><button type="submit">Search</button></div><p id="searchStatus" role="status"></p></form></div>
  <dialog id="authDialog"><button class="dialog-close" aria-label="Close" data-auth-close>×</button><p class="eyebrow">Welcome to ArtHive</p><h2 id="authHeading">Sign in to your account</h2><form id="authForm"><label id="authNameField" hidden>Display name<input type="text" name="displayName" maxlength="120" autocomplete="name"></label><label>Email address<input type="email" name="email" required autocomplete="email"></label><label>Password<input type="password" name="password" required minlength="6" autocomplete="current-password"></label><button class="primary-button" id="authSubmit" type="submit">Sign in <span>→</span></button><button class="read-link" id="authModeToggle" type="button">Create an account</button><button class="read-link" id="passwordResetButton" type="button">Forgot password?</button><button class="read-link" id="verificationResendButton" type="button" hidden>Resend verification email</button><p id="authStatus" role="status"></p></form></dialog>
  <dialog id="accountDialog"><button class="dialog-close" aria-label="Close" data-account-close>×</button><p class="eyebrow">Account settings</p><h2>Your ArtHive profile</h2><form id="accountForm"><label>Display name<input name="display_name" maxlength="100" required></label><label>Public biography<textarea name="bio" maxlength="1200" rows="4"></textarea></label><label class="founder-approval"><input name="public_profile" type="checkbox"> Show my profile publicly</label><label class="founder-approval"><input name="email_notifications" type="checkbox"> Receive account and activity email updates</label><p id="accountRole" role="status"></p><button class="primary-button" type="submit">Save account settings</button><button class="outline-button dark" id="signOutButton" type="button">Sign out</button><p id="accountStatus" role="status"></p></form><section id="adminAccountManagement" class="founder-admin-form" hidden><h3>Administrator account management</h3><p>Only administrators can change account roles or status.</p><div id="adminAccountsList"></div></section></dialog>
  <dialog id="detailDialog"><button class="dialog-close" aria-label="Close" data-detail-close>×</button><div id="detailContent"></div></dialog>
  <dialog id="imageViewerDialog" class="image-viewer-dialog"><button class="image-viewer-close" type="button" aria-label="Close image viewer">×</button><button class="image-viewer-prev" type="button" aria-label="Previous image">‹</button><img id="imageViewerImage" alt=""><button class="image-viewer-next" type="button" aria-label="Next image">›</button><button class="image-viewer-zoom" type="button" aria-label="Zoom image">Zoom</button><p id="imageViewerCaption"></p></dialog>
`

const searchOverlay = document.querySelector<HTMLDivElement>('#searchOverlay')!
const authDialog = document.querySelector<HTMLDialogElement>('#authDialog')!
const accountDialog = document.querySelector<HTMLDialogElement>('#accountDialog')!
const detailDialog = document.querySelector<HTMLDialogElement>('#detailDialog')!
const imageViewerDialog = document.querySelector<HTMLDialogElement>('#imageViewerDialog')!
const imageViewerImage = document.querySelector<HTMLImageElement>('#imageViewerImage')!
let imageViewerGallery: string[] = []
let imageViewerCaptions: string[] = []
let imageViewerIndex = 0
let imageViewerZoomed = false

function attachLocalRating(container: HTMLElement, itemKey: string) {
  const panel = document.createElement('section')
  panel.className = 'local-rating-panel'
  panel.setAttribute('aria-label', 'Guest rating')
  container.append(panel)

  const render = () => {
    let summary
    try {
      summary = getLocalRatingSummary(itemKey)
    } catch (error) {
      panel.innerHTML = '<p class="eyebrow">Guest rating</p><p class="local-rating-status" role="status"></p>'
      panel.querySelector<HTMLElement>('.local-rating-status')!.textContent =
        error instanceof Error ? error.message : 'Local ratings could not be loaded.'
      return
    }

    panel.replaceChildren()
    const heading = document.createElement('p')
    heading.className = 'eyebrow'
    heading.textContent = 'Guest rating · browser-local'
    const summaryLine = document.createElement('p')
    summaryLine.className = 'local-rating-summary'
    summaryLine.textContent = summary.average === null
      ? 'No ratings saved in this browser yet.'
      : `${summary.average.toFixed(1)} / 5 · ${summary.count} local rating`

    const stars = document.createElement('div')
    stars.className = 'local-rating-stars'
    stars.setAttribute('role', 'group')
    stars.setAttribute('aria-label', 'Choose a rating from 1 to 5 stars')
    for (let value = 1; value <= 5; value += 1) {
      const star = document.createElement('button')
      star.type = 'button'
      star.className = `local-rating-star${summary.userRating !== null && value <= summary.userRating ? ' selected' : ''}`
      star.textContent = '★'
      star.setAttribute('aria-label', `${value} star${value === 1 ? '' : 's'}`)
      star.setAttribute('aria-pressed', String(summary.userRating === value))
      star.disabled = summary.userRating !== null
      star.addEventListener('click', () => {
        const status = panel.querySelector<HTMLElement>('.local-rating-status')!
        status.textContent = 'Saving your rating on this browser…'
        try {
          submitLocalRating(itemKey, value)
          render()
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Your rating could not be saved locally.'
        }
      })
      stars.append(star)
    }

    const distribution = document.createElement('div')
    distribution.className = 'local-rating-distribution'
    distribution.setAttribute('aria-label', 'Rating distribution for this browser')
    for (let value = 5; value >= 1; value -= 1) {
      const row = document.createElement('div')
      row.className = 'local-rating-distribution-row'
      const label = document.createElement('span')
      label.textContent = `${value}★`
      const track = document.createElement('span')
      track.className = 'local-rating-track'
      const fill = document.createElement('span')
      fill.className = 'local-rating-fill'
      fill.style.width = `${summary.count ? summary.distribution[value - 1] / summary.count * 100 : 0}%`
      track.append(fill)
      const count = document.createElement('span')
      count.textContent = String(summary.distribution[value - 1])
      row.append(label, track, count)
      distribution.append(row)
    }

    const notice = document.createElement('p')
    notice.className = 'local-rating-notice'
    notice.textContent = summary.userRating === null
      ? 'This rating is saved only in this browser. It is not shared with other visitors, is not a site-wide average, and is not abuse-resistant.'
      : 'Your rating is saved only in this browser and cannot be submitted again from this browser.'
    const status = document.createElement('p')
    status.className = 'local-rating-status'
    status.setAttribute('role', 'status')
    panel.append(heading, summaryLine, stars, distribution, notice, status)
  }

  render()
}

function showImageViewer(images: string[], index: number, caption: string, captions?: string[]) {
  imageViewerGallery = images.filter(isAllowedImageReference)
  if (!imageViewerGallery.length) return
  imageViewerCaptions = captions?.length === imageViewerGallery.length ? captions : []
  imageViewerIndex = Math.min(Math.max(index, 0), imageViewerGallery.length - 1)
  imageViewerZoomed = false
  imageViewerImage.classList.remove('zoomed')
  imageViewerImage.src = localImagePath(imageViewerGallery[imageViewerIndex])
  const activeCaption = imageViewerCaptions[imageViewerIndex] ?? caption
  imageViewerImage.alt = activeCaption
  document.querySelector('#imageViewerCaption')!.textContent = `${activeCaption}${imageViewerGallery.length > 1 ? ` · ${imageViewerIndex + 1} of ${imageViewerGallery.length}` : ''}`
  document.querySelector<HTMLButtonElement>('.image-viewer-prev')!.hidden = imageViewerGallery.length < 2
  document.querySelector<HTMLButtonElement>('.image-viewer-next')!.hidden = imageViewerGallery.length < 2
  if (!imageViewerDialog.open) imageViewerDialog.showModal()
}

document.querySelector('.image-viewer-close')?.addEventListener('click', () => imageViewerDialog.close())
document.querySelector('.image-viewer-zoom')?.addEventListener('click', () => {
  imageViewerZoomed = !imageViewerZoomed
  imageViewerImage.classList.toggle('zoomed', imageViewerZoomed)
})
document.querySelector('.image-viewer-prev')?.addEventListener('click', () => {
  if (!imageViewerGallery.length) return
  imageViewerIndex = (imageViewerIndex - 1 + imageViewerGallery.length) % imageViewerGallery.length
  showImageViewer(imageViewerGallery, imageViewerIndex, imageViewerImage.alt, imageViewerCaptions)
})
document.querySelector('.image-viewer-next')?.addEventListener('click', () => {
  if (!imageViewerGallery.length) return
  imageViewerIndex = (imageViewerIndex + 1) % imageViewerGallery.length
  showImageViewer(imageViewerGallery, imageViewerIndex, imageViewerImage.alt, imageViewerCaptions)
})
document.querySelector('#detailContent')?.addEventListener('click', (event) => {
  const image = (event.target as HTMLElement).closest<HTMLImageElement>('img')
  if (!image || image.closest('button[data-gallery-image]')) return
  const path = image.getAttribute('src') ?? ''
  const imageIndex = Number(image.dataset.viewerIndex ?? 0)
  let gallery: string[] = [path]
  let captions: string[] = []
  try {
    const detailContent = document.querySelector<HTMLDivElement>('#detailContent')!
    const storedGallery: unknown = JSON.parse(detailContent.dataset.viewerImages ?? '[]')
    if (Array.isArray(storedGallery) && storedGallery.every(isAllowedImageReference)) gallery = storedGallery
    const storedCaptions: unknown = JSON.parse(detailContent.dataset.viewerCaptions ?? '[]')
    if (Array.isArray(storedCaptions) && storedCaptions.every((caption) => typeof caption === 'string')) {
      captions = storedCaptions
    }
  } catch {
    gallery = [path]
  }
  showImageViewer(gallery, imageIndex, image.alt || 'Artwork', captions)
})

document.querySelector('#searchButton')?.addEventListener('click', () => {
  searchOverlay.classList.add('open')
  searchOverlay.setAttribute('aria-hidden', 'false')
  document.querySelector<HTMLInputElement>('#searchInput')?.focus()
})

document.querySelector('[data-close]')?.addEventListener('click', () => {
  searchOverlay.classList.remove('open')
  searchOverlay.setAttribute('aria-hidden', 'true')
})

document.querySelector('#menuButton')?.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement
  const nav = document.querySelector('.main-nav')!
  const open = nav.classList.toggle('open')
  button.setAttribute('aria-expanded', String(open))
})

document.querySelector('#signInButton')?.addEventListener('click', () => {
  if (currentFirebaseUser()?.emailVerified) void openAccountDialog()
  else authDialog.showModal()
})
document.querySelector('#profileNavButton')?.addEventListener('click', () => {
  if (currentFirebaseUser()?.emailVerified) void openAccountDialog()
  else authDialog.showModal()
})
document.querySelector('#joinButton')?.addEventListener('click', () => authDialog.showModal())
document.querySelector('[data-auth-close]')?.addEventListener('click', () => authDialog.close())
document.querySelector('[data-account-close]')?.addEventListener('click', () => accountDialog.close())

document.querySelector('#searchForm')?.addEventListener('submit', (event) => {
  event.preventDefault()
  const input = document.querySelector<HTMLInputElement>('#searchInput')!
  const status = document.querySelector<HTMLParagraphElement>('#searchStatus')!
  const term = input.value.trim().toLowerCase()
  const matches = [
    ...artworks.map((item) => ({ title: item.title, creator: item.artist, category: item.category, keywords: item.keywords?.join(' ') })),
    ...literature.map((item) => ({ title: item.title, creator: item.author, category: item.type, keywords: item.keywords?.join(' ') ?? '' })),
    ...essays.map((item) => ({ title: item.title, creator: item.profiles?.display_name, category: item.category, keywords: Array.isArray(item.keywords) ? item.keywords.join(' ') : '' })),
    ...sculptures.map((item) => ({ title: item.title, creator: item.profiles?.display_name, category: item.category, keywords: item.keywords?.join(' ') })),
  ].filter((item) => `${item.title} ${item.creator ?? ''} ${item.category ?? ''} ${item.keywords ?? ''}`.toLowerCase().includes(term))
  status.textContent = term
    ? matches.length
      ? `${matches.length} matching item${matches.length === 1 ? '' : 's'} found across the museum`
      : 'No matching museum items found'
    : 'Enter a title, artist, or category'
})

document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    const filter = button.dataset.filter
    document.querySelectorAll<HTMLElement>('.art-card').forEach((card) => {
      card.hidden = filter !== 'All' && card.dataset.category !== filter
    })
  })
})

document.querySelectorAll<HTMLElement>('[data-art]').forEach((button) => {
  button.addEventListener('click', () => {
    const art = artworks.find((item) => item.id === Number(button.dataset.art))
    if (!art) return
    document.querySelector<HTMLDivElement>('#detailContent')!.innerHTML = `
      <img src="${localImagePath(art.image)}" alt="${art.title}">
      <div class="detail-copy">
        <p class="eyebrow">${art.category}</p>
        <h2>${art.title}</h2>
        <p>By ${art.artist}</p>
        ${art.price ? `<p><strong>$${art.price.toLocaleString()}</strong> · Available</p>` : '<p>Part of the ArtHive curated collection.</p>'}
        <button class="primary-button" id="inquireButton">Send inquiry <span>→</span></button>
      </div>`
    detailDialog.showModal()
    document.querySelector('#inquireButton')?.addEventListener('click', () => {
      detailDialog.close()
      authDialog.showModal()
    })
  })
})

document.querySelector('[data-detail-close]')?.addEventListener('click', () => detailDialog.close())

document.querySelector('#filmButton')?.addEventListener('click', () => {
  const content = document.querySelector<HTMLDivElement>('#detailContent')!
  content.innerHTML = `<div class="detail-copy" style="grid-column:1/-1"><p class="eyebrow">ArtHive story</p><h2>Culture, preserved and shared.</h2><p>ArtHive connects artists and audiences through exhibitions, literature, and a transparent creative marketplace.</p></div>`
  detailDialog.showModal()
})

document.querySelector('#exhibitionButton')?.addEventListener('click', () => {
  document.querySelector('#museum')?.scrollIntoView({ behavior: 'smooth' })
})

document.querySelectorAll('[data-story]').forEach((button) => {
  button.addEventListener('click', () => {
    const title = (button as HTMLElement).dataset.story
    const content = document.querySelector<HTMLDivElement>('#detailContent')!
    content.innerHTML = `<div class="detail-copy" style="grid-column:1/-1"><p class="eyebrow">Literary preview</p><h2>${title}</h2><p>The beginning of a story worth preserving. Sign in to access the complete reading archive.</p></div>`
    detailDialog.showModal()
  })
})

let authMode: 'signin' | 'register' = 'signin'
const authForm = document.querySelector<HTMLFormElement>('#authForm')!

document.querySelector('#authModeToggle')?.addEventListener('click', () => {
  authMode = authMode === 'signin' ? 'register' : 'signin'
  document.querySelector('#authHeading')!.textContent = authMode === 'signin' ? 'Sign in to your account' : 'Create your ArtHive account'
  document.querySelector('#authSubmit')!.textContent = authMode === 'signin' ? 'Sign in →' : 'Create account →'
  document.querySelector('#authModeToggle')!.textContent = authMode === 'signin' ? 'Create an account' : 'Already have an account? Sign in'
  document.querySelector<HTMLElement>('#authNameField')!.hidden = authMode !== 'register'
  document.querySelector<HTMLInputElement>('#authNameField input')!.required = authMode === 'register'
  document.querySelector<HTMLInputElement>('#authForm input[name="password"]')!.autocomplete =
    authMode === 'signin' ? 'current-password' : 'new-password'
  document.querySelector<HTMLButtonElement>('#passwordResetButton')!.hidden = authMode !== 'signin'
  document.querySelector<HTMLButtonElement>('#verificationResendButton')!.hidden = authMode !== 'signin' || !currentFirebaseUser()
  document.querySelector<HTMLParagraphElement>('#authStatus')!.textContent = ''
})

authForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const status = document.querySelector<HTMLParagraphElement>('#authStatus')!
  const formData = new FormData(authForm)
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('displayName') ?? '').trim()
  const submitButton = document.querySelector<HTMLButtonElement>('#authSubmit')!

  if (!isFirebaseConfigured) {
    status.textContent = 'Firebase Authentication is not configured. See the Firebase setup instructions in README.md.'
    return
  }
  if (authMode === 'register' && password.length < 8) {
    status.textContent = 'Choose a password with at least 8 characters.'
    return
  }
  submitButton.disabled = true
  try {
    if (authMode === 'register') {
      await registerFirebaseAccount(email, password, displayName)
      document.querySelector<HTMLButtonElement>('#verificationResendButton')!.hidden = false
      status.textContent = 'Account created. Check your email and verify the address before using private account features.'
    } else {
      const user = await signInFirebaseAccount(email, password)
      if (!user.emailVerified) {
        document.querySelector<HTMLButtonElement>('#verificationResendButton')!.hidden = false
        status.textContent = 'Verify your email address to activate ArtHive account access. Use the resend button if needed.'
      } else {
        await synchronizeFirebaseAccount(user)
        status.textContent = 'Signed in successfully.'
        authDialog.close()
      }
    }
    if (location.hash === '#ai') {
      assistantConfigLoaded = false
      await initializeAssistant()
    }
  } catch (error) {
    status.textContent = error instanceof Error
      ? error.message
      : 'Firebase account operation failed.'
  } finally {
    submitButton.disabled = false
  }
})

document.querySelector('#passwordResetButton')?.addEventListener('click', async () => {
  const email = document.querySelector<HTMLInputElement>('#authForm input[name="email"]')!.value.trim()
  const status = document.querySelector<HTMLParagraphElement>('#authStatus')!
  if (!email) {
    status.textContent = 'Enter your email address first.'
    return
  }
  try {
    await resetFirebasePassword(email)
    status.textContent = 'If an account exists for that address, Firebase will send password recovery instructions.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Password recovery could not be started.'
  }
})

document.querySelector('#verificationResendButton')?.addEventListener('click', async () => {
  const status = document.querySelector<HTMLParagraphElement>('#authStatus')!
  try {
    await resendFirebaseVerification()
    status.textContent = currentFirebaseUser()?.emailVerified
      ? 'Email verified and ArtHive account synchronized. You can now sign in.'
      : 'A new verification email has been sent.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Verification email could not be sent.'
  }
})

document.querySelector('#signOutButton')?.addEventListener('click', async () => {
  try {
    await signOutFirebaseAccount()
    accountDialog.close()
  } catch (error) {
    document.querySelector('#accountStatus')!.textContent = error instanceof Error ? error.message : 'Sign out failed.'
  }
})

if (isFirebaseConfigured) {
  void observeFirebaseAuth((user) => {
    const button = document.querySelector<HTMLButtonElement>('#signInButton')!
    if (!user) {
      button.textContent = 'Sign in'
      document.querySelector<HTMLButtonElement>('#verificationResendButton')!.hidden = true
      return
    }
    button.textContent = user.emailVerified ? (user.displayName || 'My account') : 'Verify email'
    if (!user.emailVerified) {
      document.querySelector<HTMLButtonElement>('#verificationResendButton')!.hidden = false
      return
    }
    if (location.hash === '#ai') {
      assistantConfigLoaded = false
      void initializeAssistant()
    }
  }).catch((error: unknown) => {
    const status = document.querySelector<HTMLParagraphElement>('#authStatus')
    if (status) status.textContent = error instanceof Error ? error.message : 'Firebase Authentication could not start.'
  })
}

async function openAccountDialog() {
  const user = currentFirebaseUser()
  const status = document.querySelector<HTMLParagraphElement>('#accountStatus')!
  if (!supabase || !user?.emailVerified) {
    authDialog.showModal()
    return
  }
  status.textContent = 'Loading account details…'
  accountDialog.showModal()
  try {
    const [profileResult, accountResult] = await Promise.all([
      supabase.from('profiles').select('display_name,bio,public_profile,role').eq('id', user.uid).single(),
      supabase.from('user_accounts').select('account_status,privacy_preferences,user_settings').eq('id', user.uid).single(),
    ])
    if (profileResult.error) throw profileResult.error
    if (accountResult.error) throw accountResult.error
    const form = document.querySelector<HTMLFormElement>('#accountForm')!
    ;(form.elements.namedItem('display_name') as HTMLInputElement).value = profileResult.data.display_name
    ;(form.elements.namedItem('bio') as HTMLTextAreaElement).value = profileResult.data.bio ?? ''
    ;(form.elements.namedItem('public_profile') as HTMLInputElement).checked = profileResult.data.public_profile
    ;(form.elements.namedItem('email_notifications') as HTMLInputElement).checked =
      accountResult.data.user_settings?.email_notifications === true
    document.querySelector('#accountRole')!.textContent =
      `Role: ${profileResult.data.role} · Account: ${accountResult.data.account_status}`
    const adminManagement = document.querySelector<HTMLElement>('#adminAccountManagement')!
    adminManagement.hidden = profileResult.data.role !== 'admin'
    if (profileResult.data.role === 'admin') await loadAdminAccounts()
    status.textContent = ''
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Account details could not be loaded.'
  }
}

async function loadAdminAccounts() {
  if (!supabase) return
  const container = document.querySelector<HTMLDivElement>('#adminAccountsList')!
  container.textContent = 'Loading accounts…'
  const accountsResult = await supabase.from('user_accounts')
    .select('id,email,account_status,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (accountsResult.error) throw accountsResult.error
  const accounts = accountsResult.data ?? []
  if (!accounts.length) {
    container.textContent = 'No ArtHive accounts have been synchronized yet.'
    return
  }
  const profilesResult = await supabase.from('profiles')
    .select('id,display_name,role')
    .in('id', accounts.map((account) => account.id))
  if (profilesResult.error) throw profilesResult.error
  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  container.replaceChildren()
  for (const account of accounts) {
    const profile = profilesById.get(account.id)
    if (!profile) continue
    const row = document.createElement('article')
    row.className = 'admin-account-row'
    const identity = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = profile.display_name
    const email = document.createElement('small')
    email.textContent = account.email
    identity.append(name, email)
    const role = document.createElement('select')
    role.setAttribute('aria-label', `Role for ${profile.display_name}`)
    for (const value of ['buyer', 'creator', 'admin']) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = value
      option.selected = profile.role === value
      role.append(option)
    }
    const state = document.createElement('select')
    state.setAttribute('aria-label', `Status for ${profile.display_name}`)
    for (const value of ['active', 'suspended', 'closed']) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = value
      option.selected = account.account_status === value
      state.append(option)
    }
    const save = document.createElement('button')
    save.type = 'button'
    save.className = 'read-link'
    save.textContent = 'Save'
    const isCurrentAdmin = account.id === currentFirebaseUser()?.uid
    role.disabled = isCurrentAdmin
    state.disabled = isCurrentAdmin
    save.disabled = isCurrentAdmin
    if (isCurrentAdmin) save.title = 'Use the Supabase dashboard to change the current administrator account.'
    save.addEventListener('click', async () => {
      save.disabled = true
      try {
        const { error: roleError } = await supabase!.from('profiles').update({ role: role.value }).eq('id', account.id)
        if (roleError) throw roleError
        const { error: statusError } = await supabase!.from('user_accounts')
          .update({ account_status: state.value }).eq('id', account.id)
        if (statusError) throw statusError
        save.textContent = 'Saved'
      } catch (error) {
        save.disabled = false
        save.textContent = error instanceof Error ? error.message : 'Save failed'
      }
    })
    row.append(identity, role, state, save)
    container.append(row)
  }
}

document.querySelector<HTMLFormElement>('#accountForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const data = new FormData(form)
  const user = currentFirebaseUser()
  const status = document.querySelector<HTMLParagraphElement>('#accountStatus')!
  if (!supabase || !user?.emailVerified) {
    status.textContent = 'Sign in with a verified Firebase account before saving settings.'
    return
  }
  status.textContent = 'Saving account settings…'
  try {
    const { error: profileError } = await supabase.from('profiles').update({
      display_name: String(data.get('display_name') ?? '').trim(),
      bio: String(data.get('bio') ?? '').trim() || null,
      public_profile: data.has('public_profile'),
    }).eq('id', user.uid)
    if (profileError) throw profileError
    const { error: accountError } = await supabase.from('user_accounts').update({
      privacy_preferences: { public_profile: data.has('public_profile') },
      user_settings: { email_notifications: data.has('email_notifications') },
      updated_at: new Date().toISOString(),
    }).eq('id', user.uid)
    if (accountError) throw accountError
    status.textContent = 'Account settings saved.'
    document.querySelector('#signInButton')!.textContent = String(data.get('display_name') ?? 'My account')
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Account settings could not be saved.'
  }
})

const emptyState = (message: string) => `<p class="empty-state">${message}</p>`

function renderArtworkGrid(items: Artwork[], countElementId = 'artworkResultCount') {
  const grid = document.querySelector<HTMLDivElement>('#museum-grid')!
  const count = document.querySelector<HTMLElement>(`#${countElementId}`)
  const notice = document.querySelector<HTMLElement>('#demoArtworkNotice')
  if (notice) notice.hidden = !items.some((art) => art.demonstration)
  if (count) count.textContent = `${items.length} result${items.length === 1 ? '' : 's'}`
  if (!items.length) {
    grid.innerHTML = emptyState('No artworks match these filters.')
    return
  }
  grid.innerHTML = items.map((art, i) => `
    <article class="art-card ${i === 0 ? 'art-card-large' : ''}" data-category="${art.category}">
      <button class="art-image" data-art="${art.id}" aria-label="View ${art.title}">
        <img src="${localImagePath(art.image)}" alt="${art.title} by ${art.artist}" loading="lazy">
        <span class="view-cue">View artwork</span>
      </button>
      ${art.metRecord ? `<button type="button" class="favorite-button" data-favorite="${escapeExploreText(`met:${art.metRecord.metObjectID}`)}" aria-label="${isFavorite(`met:${art.metRecord.metObjectID}`) ? 'Remove from' : 'Add to'} favorites">${isFavorite(`met:${art.metRecord.metObjectID}`) ? '♥' : '♡'}</button>` : ''}
      <div class="art-meta"><div><h3>${art.title}</h3><div class="creator-line">${art.creatorImage ? `<img src="${localImagePath(art.creatorImage)}" alt="">` : ''}<p>${art.demonstration || art.creatorPublic ? `<a class="creator-profile-link" href="#creator/${creatorSlug(art.artist)}">${art.artist}</a>` : art.artist}</p></div>${art.demonstration ? '<small class="demo-label">DEMONSTRATION</small>' : ''}</div><span>${art.metRecord ? `MET · ${art.category}` : art.category}</span></div>
    </article>`).join('')
  bindArtworkDetails()
  bindFavoriteButtons()
}

function bindFavoriteButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation()
      const id = button.dataset.favorite ?? ''
      const art = artworks.find((item) => item.metRecord && `met:${item.metRecord.metObjectID}` === id)
      if (!art?.metRecord) return
      toggleFavorite({
        id,
        title: art.title,
        artist: art.artist,
        category: art.category,
        image: art.image,
        metObjectID: art.metRecord.metObjectID,
      })
      const active = isFavorite(id)
      button.textContent = active ? '♥' : '♡'
      button.setAttribute('aria-label', `${active ? 'Remove from' : 'Add to'} favorites`)
    }
  })
}

function bindArtworkDetails() {
  document.querySelectorAll<HTMLElement>('[data-art]').forEach((button) => {
    button.onclick = () => {
      const art = artworks.find((item) => item.id === Number(button.dataset.art))
        ?? listings.find((item) => item.artworks?.id === Number(button.dataset.art))?.artworks
      if (!art) return
      const normalized = {
        id: Number(art.id),
        ratingKey: art.metRecord
          ? `met:${art.metRecord.metObjectID}`
          : button.dataset.ratingKey ?? `artworks:${Number(art.id)}`,
        title: art.title,
        artist: art.profiles?.display_name ?? art.artist ?? 'Unknown creator',
        category: art.category ?? 'Artwork',
        image: localImagePath(art.image_url ?? art.image),
        price: art.price,
        images: (art.images ?? (art.artwork_images ?? []).map((image: { image_url: string }) => image.image_url)).map(localImagePath),
        demonstration: art.demonstration === true,
        creatorPublic: art.creatorPublic === true || art.profiles?.public_profile === true,
        style: art.style ?? art.art_style ?? art.medium ?? '',
        medium: art.medium ?? art.materials ?? '',
        creationDate: art.creation_date ?? art.created_at ?? '',
        dimensions: art.dimensions ?? '',
        description: art.description ?? art.abstract ?? '',
        metRecord: art.metRecord as MetOpenAccessRecord | undefined,
      }
      const viewerRecords = normalized.metRecord
        ? metOpenAccessRecords.filter((record) => record.group === normalized.metRecord!.group)
        : []
      const viewerImages = normalized.metRecord
        ? viewerRecords.map((record) => record.localImage)
        : normalized.images.length ? normalized.images : [normalized.image]
      const viewerCaptions = normalized.metRecord
        ? viewerRecords.map((record) => record.title)
        : viewerImages.map(() => normalized.title)
      const viewerIndex = normalized.metRecord
        ? Math.max(0, viewerImages.indexOf(normalized.metRecord.localImage))
        : 0
      const gallery = normalized.images.length
        ? `<div class="detail-gallery"><img class="detail-main-image" data-viewer-index="${viewerIndex}" src="${localImagePath(normalized.images[0])}" alt="${escapeExploreText(normalized.title)}"><div>${normalized.images.map((image: string, index: number) => `<button type="button" data-gallery-image="${index}" aria-label="View angle ${index + 1}"><img src="${localImagePath(image)}" alt=""></button>`).join('')}</div></div>`
        : `<img class="detail-main-image" data-viewer-index="${viewerIndex}" src="${localImagePath(normalized.image)}" alt="${escapeExploreText(normalized.title)}">`
      const detailContent = document.querySelector<HTMLDivElement>('#detailContent')!
      detailContent.dataset.viewerImages = JSON.stringify(viewerImages)
      detailContent.dataset.viewerCaptions = JSON.stringify(viewerCaptions)
      const metFacts = normalized.metRecord
        ? [
            ['Met object ID', String(normalized.metRecord.metObjectID)],
            ['Creator role', normalized.metRecord.artistRole],
            ['Object type', normalized.metRecord.objectName],
            ['Department', normalized.metRecord.department],
            ['Classification', normalized.metRecord.classification],
            ['Culture', normalized.metRecord.culture],
            ['Period', normalized.metRecord.period],
            ['Country', normalized.metRecord.country],
            ['Region', normalized.metRecord.region],
            ['Credit line', normalized.metRecord.creditLine],
            ['Open Access', 'Public domain · CC0 1.0'],
          ].filter(([, value]) => value)
          .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeExploreText(value)}</dd></div>`)
          .join('')
        : ''
      const metAttribution = normalized.metRecord
        ? `<section class="public-work-content met-attribution">
            <h3>The Metropolitan Museum of Art · Open Access</h3>
            <p>This public-domain museum artwork is presented as a collection item, not an ArtHive marketplace listing. The Met does not endorse ArtHive.</p>
            <p><a href="${escapeExploreText(normalized.metRecord.objectURL)}" target="_blank" rel="noopener noreferrer">Official Met collection record</a> ·
              <a href="${escapeExploreText(normalized.metRecord.originalImageURL)}" target="_blank" rel="noopener noreferrer">Original museum image source</a> ·
              <a href="${escapeExploreText(normalized.metRecord.openAccessSource)}" target="_blank" rel="noopener noreferrer">Open Access information</a> ·
              <a href="${escapeExploreText(normalized.metRecord.licenseURL)}" target="_blank" rel="noopener noreferrer">CC0 1.0 license</a>
            </p>
              <a class="primary-button" href="${escapeExploreText(normalized.metRecord.objectURL)}" target="_blank" rel="noopener noreferrer">Explore Original at The Met <span>→</span></a>
          </section>`
        : ''
      detailContent.innerHTML = `
        ${gallery}
        <div class="detail-copy">
          <p class="eyebrow">${normalized.category}</p>
          <h2>${escapeExploreText(normalized.title)}</h2>
          <p>By ${normalized.demonstration || normalized.creatorPublic
            ? `<a class="creator-profile-link" href="#creator/${creatorSlug(normalized.artist)}">${escapeExploreText(normalized.artist)} · View creator profile</a>`
            : escapeExploreText(normalized.artist)}</p>
          ${normalized.description ? `<p>${escapeExploreText(normalized.description)}</p>` : ''}
          <dl class="artwork-facts">
            ${normalized.style ? `<div><dt>Style / classification</dt><dd>${escapeExploreText(normalized.style)}</dd></div>` : ''}
            ${normalized.medium ? `<div><dt>Medium / materials</dt><dd>${escapeExploreText(normalized.medium)}</dd></div>` : ''}
            ${normalized.creationDate ? `<div><dt>Creation date</dt><dd>${escapeExploreText(normalized.creationDate)}</dd></div>` : ''}
            ${normalized.dimensions ? `<div><dt>Dimensions</dt><dd>${escapeExploreText(normalized.dimensions)}</dd></div>` : ''}
            ${metFacts}
            ${normalized.demonstration ? '<div><dt>Historical or cultural background</dt><dd>Not applicable; this is fictional demonstration content.</dd></div>' : ''}
          </dl>
          ${normalized.metRecord?.artistBio ? `<p>${escapeExploreText(normalized.metRecord.artistBio)}</p>` : ''}
          ${metAttribution}
          ${normalized.demonstration ? `<p class="demo-notice">Original local demonstration artwork. Attribution is fictional; this item is not for sale.</p>` : ''}
          ${normalized.metRecord
            ? '<p>Part of The Met Open Access collection; not offered for sale by ArtHive.</p>'
            : normalized.price ? `<p><strong>$${Number(normalized.price).toLocaleString()}</strong> · Available</p>` : '<p>Part of the curated collection.</p>'}
          ${normalized.demonstration || normalized.metRecord ? '' : '<button class="primary-button" id="inquireButton">Send inquiry <span>→</span></button>'}
          ${normalized.metRecord
            ? '<p class="review-unavailable">Guest ratings are saved only in this browser. Published Met ratings and reviews are not provided here.</p>'
            : normalized.demonstration ? '<p class="review-unavailable">Written reviews are not enabled for local demonstration content.</p>' : `<form id="reviewForm" class="review-form">
            <label>Rate this artwork</label>
            <select name="rating" required><option value="">Select rating</option><option value="1">1 — Poor</option><option value="2">2 — Fair</option><option value="3">3 — Good</option><option value="4">4 — Very Good</option><option value="5">5 — Excellent</option></select>
            <textarea name="body" required minlength="10" placeholder="Share feedback about this artwork"></textarea>
            <button class="outline-button dark" type="submit">Submit review</button>
            <p id="reviewStatus" role="status"></p>
          </form>`}
        </div>`
      attachLocalRating(document.querySelector<HTMLElement>('#detailContent .detail-copy')!, normalized.ratingKey)
      detailDialog.showModal()
      document.querySelectorAll<HTMLButtonElement>('[data-gallery-image]').forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const image = normalized.images[Number(thumb.dataset.galleryImage)]
          if (image) {
            const mainImage = document.querySelector<HTMLImageElement>('.detail-main-image')!
            mainImage.src = image
            mainImage.dataset.viewerIndex = String(normalized.metRecord ? viewerIndex : Number(thumb.dataset.galleryImage ?? '0'))
          }
        })
      })
      document.querySelector('#inquireButton')?.addEventListener('click', () => {
        detailDialog.close()
        authDialog.showModal()
      })
      document.querySelector<HTMLFormElement>('#reviewForm')?.addEventListener('submit', async (event) => {
        event.preventDefault()
        if (!supabase) {
          document.querySelector('#reviewStatus')!.textContent = 'Connect Supabase to submit a review.'
          return
        }
        const form = event.currentTarget as HTMLFormElement
        const formData = new FormData(form)
        const rating = Number(formData.get('rating'))
        const body = String(formData.get('body') ?? '')
        const status = document.querySelector<HTMLParagraphElement>('#reviewStatus')!
        status.textContent = 'Submitting...'
        const { error } = await supabase.rpc('submit_artwork_review', {
          p_artwork_id: normalized.id,
          p_rating: rating,
          p_body: body,
        })
        status.textContent = error ? error.message : 'Review submitted for moderation.'
      })
    }
  })
}

function applyArtworkFilters() {
  const active = document.querySelector('[data-filter].active')?.getAttribute('data-filter') ?? 'All'
  const sort = (document.querySelector<HTMLSelectElement>('#artworkSort')?.value ?? 'recommended')
  const term = document.querySelector<HTMLInputElement>('#artworkSearch')?.value.trim().toLowerCase() ?? ''
  let items = active === 'All'
    ? [...artworks]
    : artworks.filter((art) => {
        const category = art.category.toLowerCase()
        const activeName = active.toLowerCase()
        if (activeName === 'portrait' || activeName === 'portraits') return (art.keywords ?? []).some((keyword) => keyword.toLowerCase().includes('portrait'))
        if (activeName === 'masterpiece drawings') return category === 'drawing'
        if (activeName === 'contemporary art') return (art.keywords ?? []).some((keyword) => keyword.toLowerCase().includes('contemporary')) || category === 'painting'
        if (activeName === 'historical art') return (art.creationDate ?? '').length > 0
        if (activeName === 'architecture') return (art.keywords ?? []).some((keyword) => keyword.toLowerCase().includes('architecture'))
        if (activeName === 'drawing') return category === 'drawing' || category === 'illustration'
        if (activeName === 'painting') return category === 'painting' || category === 'traditional art'
        if (activeName === 'traditional art') return category === 'traditional art' || (art.keywords ?? []).some((keyword) => keyword.toLowerCase().includes('traditional'))
        if (activeName === 'decorative art') return category === 'decorative art'
        if (activeName === 'cultural art') return category === 'traditional art' || (art.keywords ?? []).some((keyword) => ['cultural', 'heritage'].includes(keyword.toLowerCase()))
        return category === activeName || (art.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(activeName))
      })
  if (term) items = items.filter((art) =>
    `${art.title} ${art.artist} ${art.category} ${art.medium ?? ''} ${art.creationDate ?? ''} ${(art.keywords ?? []).join(' ')}`
      .toLowerCase().includes(term))
  if (sort === 'newest') items.sort((a, b) => b.id - a.id)
  if (sort === 'oldest') items.sort((a, b) => a.id - b.id)
  renderArtworkGrid(items)
}

function renderLiterature(items: typeof literature) {
  const grid = document.querySelector<HTMLDivElement>('#literature-grid')!
  const notice = document.querySelector<HTMLElement>('#demoLiteratureNotice')
  if (notice) notice.hidden = !items.some((item) => item.demonstration)
  if (!items.length) {
    grid.innerHTML = emptyState(isSupabaseConfigured
      ? 'No literature publications are available.'
      : 'No local demonstration literature is available.')
    return
  }
  grid.innerHTML = items.map((item) => `
    <article class="literature-card">
      <button type="button" class="literature-image-preview" data-literature-image="${localImagePath(item.image)}" data-literature-title="${item.title}" aria-label="View ${item.title} cover">
        <img src="${localImagePath(item.image)}" alt="${item.title} cover" loading="lazy">
      </button>
      <div><span>${item.type}${item.demonstration ? ' · Demonstration' : ''}</span><h3>${item.title}</h3><div class="creator-line">${item.authorImage ? `<img src="${localImagePath(item.authorImage)}" alt="">` : ''}<p>by ${item.demonstration || item.authorPublic ? `<a class="creator-profile-link" href="#creator/${creatorSlug(item.author)}">${item.author}</a>` : item.author}</p></div><button class="read-link" data-story="${item.title}">Read preview <span>→</span></button></div>
    </article>`).join('')
  grid.querySelectorAll<HTMLButtonElement>('.literature-image-preview').forEach((button) => {
    button.addEventListener('click', () => {
      showImageViewer([button.dataset.literatureImage ?? ''], 0, button.dataset.literatureTitle ?? 'Literature cover')
    })
  })
  grid.querySelectorAll<HTMLButtonElement>('[data-story]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = literature.find((entry) => entry.title === button.dataset.story)
      if (!item) return
      const content = document.querySelector<HTMLDivElement>('#detailContent')!
      content.innerHTML = `<div class="detail-copy" style="grid-column:1/-1"><p class="eyebrow">${item.demonstration ? 'Original demonstration text' : 'Literary preview'}</p><h2>${item.title}</h2><p>${item.preview ?? 'The beginning of a story worth preserving. Sign in to access the complete reading archive.'}</p>${item.demonstration ? '<p class="demo-notice">Fictional sample content; not a published work.</p>' : ''}</div>`
      attachLocalRating(content.querySelector<HTMLElement>('.detail-copy')!, `literature:${literature.indexOf(item) + 1}`)
      detailDialog.showModal()
    })
  })
}

function renderCategories() {
  const grid = document.querySelector<HTMLDivElement>('#categoryGrid')!
  if (!categories.length) {
    const categoryCards = [
      ['Painting', 'Painting', '/assets/images/artworks/met-collection/paintings/met-436531-peasant-woman-cooking-by-a-fireplace.jpg'],
      ['Photography', 'Photography', '/assets/images/artworks/met-collection/photography-decorative/met-302000-young-woman-with-beckers-tabletop-stereoscope.jpg'],
      ['Illustration', 'Drawing', '/assets/images/artworks/met-collection/drawings/met-370468-study-sheet-with-three-women-and-a-boy.jpg'],
      ['Sculpture', 'Sculpture', '/assets/images/artworks/met-collection/sculptures/met-191807-beside-the-sea.jpg'],
      ['Drawing', 'Drawing', '/assets/images/artworks/met-collection/drawings/met-459211-head-of-a-young-woman.jpg'],
      ['Traditional Art', 'Traditional Art', '/assets/images/artworks/met-collection/traditional-cultural/met-49936-bamboo-hedge-at-kumemura-kumemura-chikuri-from-the-series-eight-views-of-the-ryukyu-islands-ryukyu-hakkei.jpg'],
      ['Decorative Arts', 'Decorative Art', '/assets/images/artworks/met-collection/photography-decorative/met-208152-vase.jpg'],
      ['Portraits', 'Portraits', '/assets/images/artworks/met-collection/paintings/met-436820-serena-pulitzer-lederer-1867-1943.jpg'],
      ['Masterpiece Drawings', 'Drawing', '/assets/images/artworks/met-collection/drawings/met-459211-head-of-a-young-woman.jpg'],
      ['Contemporary Art', 'Contemporary Art', '/assets/images/artworks/met-collection/paintings/met-51776-painting.jpg'],
      ['Historical Art', 'Historical Art', '/assets/images/artworks/met-collection/paintings/met-49099-famous-themes-for-painting-study-known-as-the-garden-of-painting-gaen.jpg'],
      ['Digital Art', 'Digital Art', '/assets/images/artworks/met-collection/paintings/met-437429-still-life-with-peaches.jpg'],
      ['Architecture', 'Architecture', '/assets/images/artworks/met-collection/traditional-cultural/met-49936-bamboo-hedge-at-kumemura-kumemura-chikuri-from-the-series-eight-views-of-the-ryukyu-islands-ryukyu-hakkei.jpg'],
      ['Cultural Art', 'Cultural Art', '/assets/images/artworks/met-collection/traditional-cultural/met-463022-textile.jpg'],
    ]
    grid.innerHTML = categoryCards.map(([name, kind, image]) => `
      <button class="category-card" data-category-name="${name}" data-category-kind="${kind}">
        <img src="${image}" alt="${name} collection" loading="lazy">
        <strong>${name}</strong><span>Museum collection</span>
      </button>`).join('')
    bindCategoryCards()
    return
  }
  grid.innerHTML = categories.map((category) => `
    <button class="category-card" data-category-id="${category.id}" data-category-name="${category.name}" data-category-kind="${category.kind}">
      <img src="${localImagePath(category.image_url)}" alt="">
      <strong>${category.name}</strong><span>${category.kind} collection</span>
    </button>`).join('')
  bindCategoryCards()
}

function bindCategoryCards() {
  document.querySelectorAll<HTMLElement>('[data-category-name]').forEach((card) => {
    card.addEventListener('click', () => {
      const kind = (card.dataset.categoryKind ?? '').toLowerCase()
      if (kind === 'literature' || kind === 'sculpture' || kind === 'essay') {
        const collection = kind === 'literature' ? 'literature' : kind === 'sculpture' ? 'sculptures' : 'essays'
        location.hash = `#collection/${collection}`
        return
      }
      document.querySelector('#museum')?.scrollIntoView({ behavior: 'smooth' })
      const categoryName = card.dataset.categoryName ?? ''
      const filter = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')]
        .find((button) => button.dataset.filter?.toLowerCase() === categoryName.toLowerCase())
      if (filter) filter.click()
    })
  })
}

function renderListings() {
  const grid = document.querySelector<HTMLDivElement>('#market-grid')!
  const min = Number(document.querySelector<HTMLInputElement>('#priceMin')?.value ?? 0)
  const maxValue = document.querySelector<HTMLInputElement>('#priceMax')?.value
  const max = maxValue ? Number(maxValue) : Number.POSITIVE_INFINITY
  const sort = document.querySelector<HTMLSelectElement>('#marketSort')?.value ?? 'recommended'
  const marketCategory = document.querySelector<HTMLSelectElement>('#marketCategory')?.value ?? ''
  const marketTerm = document.querySelector<HTMLInputElement>('#marketSearch')?.value.trim().toLowerCase() ?? ''
  let items = listings.filter((item) => {
    const art = item.artworks ?? {}
    return Number(item.price) >= min
      && Number(item.price) <= max
      && (!marketTerm || `${art.title ?? ''} ${art.profiles?.display_name ?? ''} ${art.category ?? ''}`.toLowerCase().includes(marketTerm))
      && (!marketCategory || marketCategory.toLowerCase().startsWith('featured') || marketCategory.toLowerCase().startsWith('recent') || marketCategory.toLowerCase().startsWith('popular') || marketCategory.toLowerCase().startsWith('collector') || `${art.category ?? ''}`.toLowerCase().includes(marketCategory.toLowerCase().replace(/s$/, '').replace('paintings','painting').replace('sculptures','sculpture').replace('photography','photograph').replace('illustrations','illustration').replace('digital art','digital').replace('traditional art','traditional')))
  })
  if (sort === 'low') items.sort((a, b) => Number(a.price) - Number(b.price))
  if (sort === 'high') items.sort((a, b) => Number(b.price) - Number(a.price))
  if (sort === 'newest') items.sort((a, b) => b.id - a.id)
  if (!items.length) {
    let references = artworks.filter((art) => art.metRecord)
    if (marketTerm) references = references.filter((art) =>
      `${art.title} ${art.artist} ${art.category} ${art.medium ?? ''}`.toLowerCase().includes(marketTerm))
    if (marketCategory) {
      const categoryTerm = marketCategory.toLowerCase()
      if (!['featured artworks', 'recently added', 'popular artworks', 'collector\'s picks', 'historical masterpieces'].includes(categoryTerm)) {
        references = references.filter((art) =>
          art.category.toLowerCase().includes(categoryTerm.replace(/s$/, ''))
          || (art.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(categoryTerm.replace(/s$/, ''))))
      }
      if (categoryTerm === 'historical masterpieces') {
        references = references.filter((art) => art.metRecord?.isHighlight || Number((art.creationDate ?? '').match(/\d{3,4}/)?.[0] ?? 0) < 1900)
      }
    }
    if (sort === 'newest') references.sort((a, b) => b.id - a.id)
    if (sort === 'oldest') references.sort((a, b) => a.id - b.id)
    grid.innerHTML = references.length
      ? `<p class="market-reference-notice">Museum references · These works are not for sale by ArtHive.</p>${references.slice(0, 12).map((art) => `
        <article class="market-card">
          <button class="market-image" data-art="${art.id}" aria-label="View ${escapeExploreText(art.title)}">
            <img src="${localImagePath(art.image)}" alt="${escapeExploreText(art.title)}" loading="lazy">
            <span class="availability">Museum reference</span>
          </button>
          <div>
            <h3>${escapeExploreText(art.title)}</h3>
            <p>${escapeExploreText(art.artist)}</p>
            <p>${escapeExploreText(art.creationDate ?? 'Date not provided')} · ${escapeExploreText(art.medium ?? art.category)}</p>
            <p>${escapeExploreText(art.description ?? 'Open-access museum collection record.')}</p>
            <div class="market-card-actions">
              <button type="button" class="read-link" data-art="${art.id}">View details →</button>
              <button type="button" class="card-action" data-favorite="${escapeExploreText(`met:${art.metRecord!.metObjectID}`)}" aria-label="Bookmark ${escapeExploreText(art.title)}">${isFavorite(`met:${art.metRecord!.metObjectID}`) ? '♥' : '♡'}</button>
              <button type="button" class="card-action" data-share-art="${escapeExploreText(art.title)}" data-share-url="${escapeExploreText(art.metRecord!.objectURL)}" aria-label="Share ${escapeExploreText(art.title)}">↗</button>
            </div>
          </div>
        </article>`).join('')} `
      : emptyState('No marketplace listings or matching museum references are available.')
    bindArtworkDetails()
    bindMarketplaceActions(grid)
    bindFavoriteButtons()
    return
  }
  grid.innerHTML = items.map((item) => {
    const art = item.artworks ?? {}
    const creator = art.profiles ?? {}
    return `<article class="market-card">
      <button class="market-image" data-art="${art.id}" data-rating-key="marketplace:${item.id}"><img src="${localImagePath(art.image_url)}" alt="${art.title ?? 'Artwork'}" loading="lazy"><span class="availability">${item.availability}</span></button>
      <div><h3>${art.title ?? 'Untitled'}</h3><div class="creator-line">${creator.avatar_url ? `<img src="${localImagePath(creator.avatar_url)}" alt="">` : ''}<p>${creator.display_name ?? 'Creator'}${creator.verified ? ' · Verified' : ''}</p></div><strong>${item.currency ?? 'USD'} ${Number(item.price).toLocaleString()}</strong></div>
    </article>`
  }).join('')
  grid.querySelectorAll<HTMLElement>('.market-card').forEach((card, index) => {
    const item = items[index]
    if (item) attachLocalRating(card, `marketplace:${item.id}`)
  })
  bindArtworkDetails()
}

function bindMarketplaceActions(container: HTMLElement) {
  container.querySelectorAll<HTMLButtonElement>('[data-share-art]').forEach((button) => {
    button.addEventListener('click', async () => {
      const title = button.dataset.shareArt ?? 'ArtHive artwork'
      const url = button.dataset.shareUrl ?? location.href
      if (navigator.share) {
        await navigator.share({ title, url }).catch(() => undefined)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url).catch(() => undefined)
        button.textContent = '✓'
      }
    })
  })
  container.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      const id = button.dataset.favorite ?? ''
      const art = artworks.find((item) => item.metRecord && `met:${item.metRecord.metObjectID}` === id)
      if (!art?.metRecord) return
      const active = toggleFavorite({
        id,
        title: art.title,
        artist: art.artist,
        category: art.category,
        image: art.image,
        metObjectID: art.metRecord.metObjectID,
      })
      button.textContent = active ? '♥' : '♡'
      button.setAttribute('aria-label', `${active ? 'Remove from' : 'Add to'} favorites`)
    })
  })
}

function metCreatorName(record: MetOpenAccessRecord) {
  return [record.artistPrefix, record.artist].filter(Boolean).join(' ').trim()
}

function metArtworkCategory(record: MetOpenAccessRecord) {
  if (record.group === 'paintings') return 'Painting'
  if (record.group === 'drawings') return 'Drawing'
  if (record.group === 'traditional-cultural') return 'Traditional Art'
  if (record.group === 'photography-decorative') {
    return record.department === 'Photographs' ? 'Photography' : 'Decorative Art'
  }
  return 'Sculpture'
}

function metSearchKeywords(record: MetOpenAccessRecord) {
  const category = metArtworkCategory(record)
  const curatedTerms = record.group === 'traditional-cultural'
    ? ['Traditional Art', 'Cultural Art']
    : record.group === 'photography-decorative'
      ? [record.department === 'Photographs' ? 'Photography' : 'Decorative Art']
      : []
  if (record.group === 'sculptures') {
    if (record.department === 'Modern and Contemporary Art') curatedTerms.push('Contemporary Sculpture')
    if ([record.culture, record.period, record.country, record.region].some(Boolean)) {
      curatedTerms.push('Cultural Sculpture')
    }
    const materialText = `${record.medium} ${record.classification}`.toLowerCase()
    if (materialText.includes('wood')) curatedTerms.push('Wood Sculpture')
    if (materialText.includes('stone')) curatedTerms.push('Stone Sculpture')
    if (materialText.includes('metal') || materialText.includes('bronze')) curatedTerms.push('Metal Sculpture')
    if (materialText.includes('clay') || materialText.includes('ceramic')) curatedTerms.push('Ceramic Sculpture')
    if (materialText.includes('marble')) curatedTerms.push('Marble Sculpture')
  }
  return [
    ...record.tags,
    ...curatedTerms,
    record.objectName,
    record.classification,
    record.culture,
    record.period,
    record.country,
    record.region,
    record.department,
    metSearchQuery(category),
    'Met Open Access',
  ].filter(Boolean)
}

async function loadDiscoveryData() {
  const museumGrid = document.querySelector<HTMLDivElement>('#museum-grid')!
  museumGrid.innerHTML = '<p class="loading-state">Loading collection…</p>'
  try {
    const dataPromise = isSupabaseConfigured
      ? fetchDiscoveryData()
      : Promise.resolve({
          artworks: [],
          literature: [],
          essays: [],
          sculptures: [],
          exhibitions: [],
          listings: [],
          categories: [],
          bestSellers: [],
        })
    const [data, metRecords] = await Promise.all([
      dataPromise,
      fetchMetOpenAccessRecords(),
    ])
    metOpenAccessRecords = metRecords
    const contributedArtworks = (data.artworks as any[]).map((item) => ({
      id: item.id,
      title: item.title,
      artist: item.profiles?.display_name ?? item.artist ?? 'Unknown creator',
      category: item.category ?? 'Artwork',
      image: item.image_url ?? item.image,
      creatorImage: item.profiles?.avatar_url,
      creatorBio: item.profiles?.bio ?? '',
      creatorPublic: item.profiles?.public_profile !== false,
      creatorVerified: item.profiles?.verified === true,
      images: item.gallery_urls,
      description: item.description ?? item.abstract,
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      demonstration: item.demonstration === true,
      style: item.style,
      medium: item.medium,
      creationDate: item.creation_date,
      dimensions: item.dimensions,
    }))
    const metArtworks = metRecords
      .filter((record) => record.group !== 'sculptures')
      .map((record): Artwork => ({
        id: record.id,
        title: record.title,
        artist: metCreatorName(record),
        category: metArtworkCategory(record),
        image: record.localImage,
        description: record.description ?? undefined,
        keywords: metSearchKeywords(record),
        creationDate: record.objectDate,
        medium: record.medium,
        style: record.classification || record.objectName,
        dimensions: record.dimensions,
        creatorBio: record.artistBio,
        creatorPublic: false,
        metRecord: record,
      }))
    artworks = [...contributedArtworks, ...metArtworks]
    literature = (data.literature as any[]).map((item) => ({
      id: item.id,
      title: item.title,
      author: item.profiles?.display_name ?? item.author ?? 'Unknown author',
      type: item.category ?? item.genre ?? item.type ?? 'Literature',
      read: item.read ?? (item.publication_date ? 'Published work' : 'Literary work'),
      image: item.cover_url ?? item.image ?? '',
      authorImage: item.profiles?.avatar_url,
      authorBio: item.profiles?.bio ?? '',
      authorPublic: item.profiles?.public_profile !== false,
      preview: item.preview ?? item.content,
      description: item.description ?? '',
      content: item.content ?? item.preview ?? '',
      publicationDate: item.publication_date ?? item.created_at,
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      demonstration: item.demonstration === true,
    }))
    essays = data.essays as any[]
    const metSculptures = metRecords
      .filter((record) => record.group === 'sculptures')
      .map((record) => ({
        id: record.id,
        title: record.title,
        profiles: {
          display_name: metCreatorName(record),
          public_profile: false,
          bio: record.artistBio,
        },
        category: 'Sculpture',
        subcategory: record.objectName,
        image_url: record.localImage,
        description: record.description,
        style: record.classification || record.objectName,
        materials: record.medium,
        medium: record.medium,
        creation_date: record.objectDate,
        dimensions: record.dimensions,
        keywords: metSearchKeywords(record),
        metRecord: record,
      }))
    sculptures = [...(data.sculptures as any[]), ...metSculptures]
    exhibitions = data.exhibitions as any[]
    listings = data.listings
    categories = data.categories
    bestSellers = data.bestSellers

    document.querySelector('#statArtworks')!.textContent = String(artworks.length)
    document.querySelector('#statLiterature')!.textContent = String(literature.length)
    document.querySelector('#statListings')!.textContent = String(listings.length)
    document.querySelector('#statCreators')!.textContent = String(new Set(
      artworks.filter((item) => !item.metRecord).map((item) => item.artist),
    ).size)

    renderArtworkGrid(artworks)
    renderLiterature(literature)
    renderListings()
    renderCategories()
    renderBestSellers()
    renderFeaturedExhibition()
    renderCreatorDirectory()
    if (location.hash.startsWith('#collection/') || location.hash === '#explore') handleCollectionRoute()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discovery data could not be loaded.'
    museumGrid.innerHTML = emptyState(message)
  }
}

function renderBestSellers(items = bestSellers) {
  const grid = document.querySelector<HTMLDivElement>('#bestSellerGrid')!
  if (!items.length) {
    const references = artworks.filter((art) => art.metRecord).slice(0, 8)
    grid.innerHTML = `
      <div class="best-seller-empty" role="status">
        <p class="eyebrow">Verified sales unavailable</p>
        <h3>No verified completed sales are available to rank best sellers.</h3>
        <p>Until completed transactions are verified, no sales counts or rankings are displayed.</p>
      </div>
      ${references.map((art, index) => `
        <article class="market-card best-seller-card editorial-card">
          <button class="market-image" data-art="${art.id}" aria-label="View ${escapeExploreText(art.title)}">
            <img src="${localImagePath(art.image)}" alt="${escapeExploreText(art.title)}" loading="lazy">
            <span class="availability">Editor's Pick · ${index + 1}</span>
          </button>
          <div>
            <h3>${escapeExploreText(art.title)}</h3>
            <p>${escapeExploreText(art.artist)}</p>
            <p>${escapeExploreText(art.category)} · ${escapeExploreText(art.creationDate ?? 'Date not provided')}</p>
            <strong>Museum reference</strong>
          </div>
        </article>`).join('')}
    `
    bindArtworkDetails()
    return
  }
  grid.innerHTML = items.map((item) => `
    <article class="market-card best-seller-card">
      <button class="market-image" data-art="${item.artwork_id}" data-rating-key="artworks:${item.artwork_id}">
        <img src="${localImagePath(item.image_url)}" alt="${item.title}" loading="lazy"><span class="best-badge">Best Seller</span>
      </button>
      <div><h3>${item.title}</h3><p>${item.seller_name ?? 'Creator'}${item.verified ? ' · Verified' : ''}</p><strong>${item.price ?? '0'} USD</strong><p>${Number(item.average_rating).toFixed(1)} stars · ${item.review_count ?? 0} reviews · ${item.completed_sales} completed sales</p></div>
    </article>`).join('')
  grid.querySelectorAll<HTMLElement>('.best-seller-card').forEach((card, index) => {
    const item = items[index]
    if (item) attachLocalRating(card, `artworks:${item.artwork_id}`)
  })
  bindArtworkDetails()
}

function renderFeaturedExhibition() {
  const exhibition = exhibitions[0]
  if (!exhibition) return
  const section = document.querySelector<HTMLElement>('#exhibitions')!
  const image = section.querySelector<HTMLImageElement>('.feature-image img')
  const heading = section.querySelector<HTMLHeadingElement>('.feature-copy h2')
  const description = section.querySelector<HTMLElement>('.feature-copy > p:not(.eyebrow)')
  if (image && exhibition.banner_url) {
    image.src = localImagePath(exhibition.banner_url)
    image.alt = `${exhibition.title} exhibition`
  }
  if (heading) heading.textContent = exhibition.title
  if (description) description.textContent = exhibition.description ?? ''
  const dates = section.querySelectorAll<HTMLElement>('.feature-details span')
  if (dates[0]) dates[0].textContent = [exhibition.starts_at, exhibition.ends_at].filter(Boolean).join(' — ')
}

document.querySelector('#artworkSort')?.addEventListener('change', applyArtworkFilters)
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    applyArtworkFilters()
  })
})
document.querySelector('#artworkSearch')?.addEventListener('input', applyArtworkFilters)
document.querySelector('#literatureSearch')?.addEventListener('input', (event) => {
  const term = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()
  renderLiterature(literature.filter((item) => `${item.title} ${item.author} ${item.type}`.toLowerCase().includes(term)))
})
document.querySelector('#literatureSort')?.addEventListener('change', (event) => {
  const sort = (event.currentTarget as HTMLSelectElement).value
  const items = [...literature]
  if (sort === 'title') items.sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'oldest') items.reverse()
  renderLiterature(items)
})
document.querySelector('#priceMin')?.addEventListener('input', renderListings)
document.querySelector('#priceMax')?.addEventListener('input', renderListings)
document.querySelector('#marketSearch')?.addEventListener('input', renderListings)
document.querySelector('#marketCategory')?.addEventListener('change', renderListings)
document.querySelector('#marketSort')?.addEventListener('change', renderListings)
document.querySelector('#resetMarketFilters')?.addEventListener('click', () => {
  const min = document.querySelector<HTMLInputElement>('#priceMin')!
  const max = document.querySelector<HTMLInputElement>('#priceMax')!
  const sort = document.querySelector<HTMLSelectElement>('#marketSort')!
  const category = document.querySelector<HTMLSelectElement>('#marketCategory')!
  const search = document.querySelector<HTMLInputElement>('#marketSearch')!
  min.value = ''
  max.value = ''
  sort.value = 'recommended'
  category.value = ''
  search.value = ''
  renderListings()
})
document.querySelector('#bestSellerPeriod')?.addEventListener('change', async (event) => {
  if (!supabase) return
  const period = (event.currentTarget as HTMLSelectElement).value
  const { data, error } = await supabase.rpc('get_best_sellers', { period, limit_count: 8 })
  if (!error) renderBestSellers(data ?? [])
})

async function recordSearch(term: string, count: number) {
  if (!supabase || !term) return
  await supabase.from('search_analytics').insert({ query: term, result_count: count })
  const user = currentFirebaseUser()
  if (user?.emailVerified) await supabase.from('search_history').insert({ user_id: user.uid, query: term })
}

document.querySelector<HTMLInputElement>('#searchInput')?.addEventListener('input', (event) => {
  const term = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()
  const status = document.querySelector<HTMLParagraphElement>('#searchStatus')!
  const suggestions = [
    ...artworks.map((item) => ({ title: item.title, artist: item.artist, category: item.category, keywords: item.keywords?.join(' ') })),
    ...literature.map((item) => ({ title: item.title, artist: item.author, category: item.type, keywords: item.keywords?.join(' ') ?? '' })),
    ...essays.map((item) => ({ title: item.title, artist: item.profiles?.display_name ?? 'Unknown author', category: item.category, keywords: Array.isArray(item.keywords) ? item.keywords.join(' ') : '' })),
    ...sculptures.map((item) => ({ title: item.title, artist: item.profiles?.display_name ?? 'Unknown creator', category: item.category, keywords: item.keywords?.join(' ') })),
  ].filter((item) => `${item.title} ${item.artist} ${item.category} ${item.keywords ?? ''}`.toLowerCase().includes(term))
    .slice(0, 5)
  status.innerHTML = !term
    ? '<span>Try: paintings, contemporary art, poetry</span>'
    : suggestions.length
      ? suggestions.map((item) => `<button type="button" class="search-suggestion">${item.title} — ${item.artist}</button>`).join('')
      : 'No results. Try another title, creator, category, or collection.'
  document.querySelectorAll<HTMLElement>('.search-suggestion').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.querySelector<HTMLInputElement>('#searchInput')!
      input.value = button.textContent?.split(' — ')[0] ?? ''
      input.dispatchEvent(new Event('submit'))
    })
  })
})

document.querySelector('#searchForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const input = document.querySelector<HTMLInputElement>('#searchInput')!
  const status = document.querySelector<HTMLParagraphElement>('#searchStatus')!
  const term = input.value.trim()
  const lower = term.toLowerCase()
  const matches = [
    ...artworks.map((item) => ({ title: item.title, artist: item.artist, category: item.category, keywords: item.keywords?.join(' ') })),
    ...literature.map((item) => ({ title: item.title, artist: item.author, category: item.type, keywords: item.keywords?.join(' ') ?? '' })),
    ...essays.map((item) => ({ title: item.title, artist: item.profiles?.display_name, category: item.category, keywords: Array.isArray(item.keywords) ? item.keywords.join(' ') : '' })),
    ...sculptures.map((item) => ({ title: item.title, artist: item.profiles?.display_name, category: item.category, keywords: item.keywords?.join(' ') })),
  ].filter((item) => `${item.title} ${item.artist ?? ''} ${item.category ?? ''} ${item.keywords ?? ''}`.toLowerCase().includes(lower))
  status.textContent = term ? `${matches.length} matching result${matches.length === 1 ? '' : 's'} found` : 'Enter a title, creator, category, or collection'
  if (term) {
    const history = JSON.parse(localStorage.getItem('arthive_search_history') ?? '[]') as string[]
    localStorage.setItem('arthive_search_history', JSON.stringify([term, ...history.filter((item) => item !== term)].slice(0, 8)))
    await recordSearch(term, matches.length)
  }
})

type CollectionItem = {
  id: number
  title: string
  creator: string
  category: string
  subcategory?: string
  image: string
  images?: string[]
  creatorImage?: string
  description?: string
  content?: string
  background?: string
  date?: string
  keywords?: string[]
  demonstration?: boolean
  style?: string
  medium?: string
  dimensions?: string
  creatorBio?: string
  creatorPublic?: boolean
  creatorVerified?: boolean
  metRecord?: MetOpenAccessRecord
}

function collectionItems(slug: string): CollectionItem[] {
  if (slug === 'artworks') return artworks.map((item) => ({
    id: item.id, title: item.title, creator: item.artist, category: item.category,
    subcategory: (item as any).subcategory, image: item.image,
    images: item.images?.filter(isAllowedImageReference),
    creatorImage: item.creatorImage, description: item.description,
    date: item.creationDate, keywords: item.keywords,
    demonstration: item.demonstration, style: item.style, medium: item.medium,
    dimensions: item.dimensions, creatorBio: item.creatorBio,
    creatorPublic: item.creatorPublic, creatorVerified: item.creatorVerified,
    metRecord: item.metRecord,
  })).filter((item) => isAllowedImageReference(item.image))
  if (slug === 'literature') return literature.map((item) => ({
    id: item.id, title: item.title, creator: item.author, category: item.type,
    image: item.image, creatorImage: item.authorImage, description: item.description,
    content: item.content ?? item.preview, date: item.publicationDate,
    keywords: item.keywords, demonstration: item.demonstration,
    creatorBio: item.authorBio, creatorPublic: item.authorPublic,
  })).filter((item) => isAllowedImageReference(item.image))
  if (slug === 'essays') return essays.map((item) => ({
    id: Number(item.id), title: item.title, creator: item.profiles?.display_name ?? 'Unknown author',
    category: item.category ?? 'Essay', subcategory: item.subcategory,
    image: item.cover_url ?? '', creatorImage: item.profiles?.avatar_url,
    description: item.abstract ?? item.description ?? '', content: item.content,
    background: item.background, date: item.publication_date ?? item.created_at,
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    demonstration: item.demonstration === true, creatorBio: item.profiles?.bio ?? '',
    creatorPublic: item.profiles?.public_profile !== false,
    creatorVerified: item.profiles?.verified === true,
  })).filter((item) => item.id && isAllowedImageReference(item.image))
  if (slug === 'sculptures') return sculptures.map((item) => {
    const images = (item.sculpture_images ?? [])
      .map((image: { image_url: string }) => image.image_url)
      .filter(isAllowedImageReference)
    return {
      id: Number(item.id), title: item.title,
      creator: item.profiles?.display_name ?? 'Unknown sculptor',
      category: item.category ?? 'Sculpture', subcategory: item.subcategory,
      image: images[0] ?? item.image_url ?? '',
      images, creatorImage: item.profiles?.avatar_url,
      description: item.description, content: item.content,
      background: item.background ?? item.historical_context,
      date: item.creation_date ?? item.created_at,
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      demonstration: item.demonstration === true, style: item.style,
      medium: item.materials ?? item.medium, dimensions: item.dimensions,
      creatorBio: item.profiles?.bio ?? '',
      creatorPublic: item.profiles?.public_profile !== false,
      creatorVerified: item.profiles?.verified === true,
      metRecord: item.metRecord as MetOpenAccessRecord | undefined,
    }
  }).filter((item: CollectionItem) => item.id && isAllowedImageReference(item.image))
  return []
}

function searchableCollectionItem(item: CollectionItem, collectionSlug: string) {
  const collection = getExploreCollection(collectionSlug)
  const tags = collection?.subcategories
    .filter((subcategory) => matchesSubcategory(item, subcategory))
    .map((subcategory) => subcategory.title) ?? []
  return [
    item.title, item.creator, item.creatorBio, item.category, item.subcategory, item.description,
    item.content, item.background, item.style, item.medium, item.date,
    ...(item.keywords ?? []), ...tags,
  ].filter(Boolean).join(' ').toLowerCase()
}

function matchesSubcategory(item: CollectionItem, subcategory: { matches: string[] }) {
  const searchableText = [
    item.category, item.subcategory, item.title, item.description,
    item.background, item.style, item.medium, ...(item.keywords ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
  return subcategory.matches.some((match) => searchableText.includes(match.toLowerCase()))
}

function escapeExploreText(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function renderExploreScreen() {
  const grid = document.querySelector<HTMLDivElement>('#exploreGrid')!
  grid.innerHTML = exploreCollections.map((collection) => {
    const count = collectionItems(collection.slug).length
    return `<a class="explore-card" href="#collection/${collection.slug}">
      <img src="${localImagePath(collection.image)}" alt="${collection.title} collection" loading="lazy">
      <div><p>${count} available ${count === 1 ? 'work' : 'works'}</p><h2>${collection.title}</h2><span>${collection.description}</span><strong>Explore collection →</strong></div>
    </a>`
  }).join('')
  renderExploreSearchResults(document.querySelector<HTMLInputElement>('#exploreSearch')?.value ?? '')
}

function renderExploreSearchResults(query: string) {
  const results = document.querySelector<HTMLDivElement>('#exploreSearchResults')!
  const term = query.trim().toLowerCase()
  if (!term) {
    results.replaceChildren()
    return
  }
  const matches = exploreCollections.flatMap((collection) =>
    collectionItems(collection.slug)
      .filter((item) => searchableCollectionItem(item, collection.slug).includes(term))
      .map((item) => ({ collection, item })),
  )
  if (!matches.length) {
    results.innerHTML = `<p class="explore-result-count">No published works match “${escapeExploreText(query.trim())}”. Try a title, creator, category, or keyword.</p>`
    return
  }
  results.innerHTML = `<div class="explore-results-heading"><h2>Search results</h2><span>${matches.length} result${matches.length === 1 ? '' : 's'}</span></div>
    <div class="explore-results-grid">${matches.map(({ collection, item }) => `
      <button class="explore-result-card" type="button" data-explore-item="${collection.slug}:${item.id}">
        <img src="${localImagePath(item.image)}" alt="${escapeExploreText(item.title)}" loading="lazy">
        <span>${collection.title} · ${escapeExploreText(item.category)}</span>
        <strong>${escapeExploreText(item.title)}</strong>
        <small>${escapeExploreText(item.creator)}</small>
      </button>`).join('')}</div>`
  results.querySelectorAll<HTMLButtonElement>('[data-explore-item]').forEach((button) => {
    button.addEventListener('click', () => {
      const [collectionSlug, id] = (button.dataset.exploreItem ?? '').split(':')
      const item = collectionItems(collectionSlug ?? '').find((entry) => entry.id === Number(id))
      if (item && collectionSlug) openCollectionItemDetail(item, collectionSlug)
    })
  })
}

function renderFavoritesScreen() {
  const grid = document.querySelector<HTMLDivElement>('#favoritesGrid')!
  const favorites = getFavorites()
  if (!favorites.length) {
    grid.innerHTML = emptyState('No saved artworks yet. Use the heart button on a Met collection artwork to save it here.')
    return
  }
  grid.innerHTML = favorites.map((item) => `
    <article class="collection-card">
      <button type="button" data-favorite-detail="${escapeExploreText(item.id)}" aria-label="View ${escapeExploreText(item.title)}">
        <img src="${localImagePath(item.image)}" alt="${escapeExploreText(item.title)}" loading="lazy">
      </button>
      <button type="button" class="favorite-button" data-remove-favorite="${escapeExploreText(item.id)}" aria-label="Remove ${escapeExploreText(item.title)} from favorites">♥</button>
      <div><p>The Met Open Access</p><h2>${escapeExploreText(item.title)}</h2><span>${escapeExploreText(item.artist)} · ${escapeExploreText(item.category)}</span></div>
    </article>`).join('')
  grid.querySelectorAll<HTMLButtonElement>('[data-remove-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.removeFavorite ?? ''
      const item = getFavorites().find((entry) => entry.id === id)
      if (item) toggleFavorite(item)
      renderFavoritesScreen()
    })
  })
  grid.querySelectorAll<HTMLButtonElement>('[data-favorite-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      const favorite = getFavorites().find((item) => item.id === (button.dataset.favoriteDetail ?? ''))
      if (!favorite?.metObjectID) return
      const art = artworks.find((item) => item.metRecord?.metObjectID === favorite.metObjectID)
      if (art) {
        const fakeButton = document.createElement('button')
        fakeButton.dataset.art = String(art.id)
        document.body.append(fakeButton)
        bindArtworkDetails()
        fakeButton.click()
        fakeButton.remove()
      }
    })
  })
}

function resolveCollectionRoute(route: string) {
  const [collectionSlug, subcategorySlug] = route.split('/')
  const collection = getExploreCollection(collectionSlug ?? '')
  if (collection) return { collection, subcategory: getExploreSubcategory(collection, subcategorySlug ?? '') }
  const legacySubcategory = exploreCollections
    .map((candidate) => ({ collection: candidate, subcategory: getExploreSubcategory(candidate, collectionSlug ?? '') }))
    .find((candidate) => candidate.subcategory)
  return legacySubcategory?.subcategory
    ? { collection: legacySubcategory.collection, subcategory: legacySubcategory.subcategory }
    : undefined
}

function renderCollectionScreen(route: string) {
  const resolved = resolveCollectionRoute(route)
  if (!resolved) return
  const { collection, subcategory } = resolved
  document.querySelector('#collectionEyebrow')!.textContent = subcategory
    ? `${collection.title} · Subcategory`
    : 'Museum collection'
  document.querySelector('#collectionTitle')!.textContent = subcategory?.title ?? collection.title
  const categorySelect = document.querySelector<HTMLSelectElement>('#collectionCategory')!
  const items = collectionItems(collection.slug)
  const categoriesForCollection = [...new Set(items.map((item) => item.category).filter(Boolean))]
  categorySelect.innerHTML = '<option value="">All item categories</option>' + categoriesForCollection
    .map((category) => `<option value="${escapeExploreText(category)}">${escapeExploreText(category)}</option>`).join('')
  const subcategoryNav = document.querySelector<HTMLElement>('#collectionSubcategories')!
  subcategoryNav.innerHTML = `<a class="subcategory-card${subcategory ? '' : ' active'}" href="#collection/${collection.slug}">
      <span class="subcategory-card-all">All ${collection.title}</span><strong>Browse all</strong>
    </a>${collection.subcategories.map((entry) => `
      <a class="subcategory-card${entry.slug === subcategory?.slug ? ' active' : ''}" href="#collection/${collection.slug}/${entry.slug}">
        <img src="${localImagePath(entry.image)}" alt="" loading="lazy">
        <span>${entry.title}</span><small>${entry.description}</small>
      </a>`).join('')}`
  renderCollectionItems(collection.slug, subcategory?.slug)
}

function renderCollectionItems(collectionSlug: string, subcategorySlug?: string) {
  const term = document.querySelector<HTMLInputElement>('#collectionSearch')?.value.trim().toLowerCase() ?? ''
  const category = document.querySelector<HTMLSelectElement>('#collectionCategory')?.value ?? ''
  const sort = document.querySelector<HTMLSelectElement>('#collectionSort')?.value ?? 'recommended'
  const collection = getExploreCollection(collectionSlug)
  const activeSubcategory = collection && subcategorySlug
    ? getExploreSubcategory(collection, subcategorySlug)
    : undefined
  let items = collectionItems(collectionSlug).filter((item) =>
    (!category || item.category === category)
    && (!activeSubcategory || matchesSubcategory(item, activeSubcategory))
    && (!term || searchableCollectionItem(item, collectionSlug).includes(term)))
  if (sort === 'title') items.sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'newest') items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  if (sort === 'oldest') items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  document.querySelector('#collectionCount')!.textContent = `${items.length} result${items.length === 1 ? '' : 's'}`
  const grid = document.querySelector<HTMLDivElement>('#collectionGrid')!
  const notice = document.querySelector<HTMLElement>('#demoCollectionNotice')
  if (notice) notice.hidden = !items.some((item) => item.demonstration)
  grid.innerHTML = items.length
    ? items.map((item) => `<article class="collection-card">
        <button type="button" data-collection-detail="${item.id}" data-collection-slug="${collectionSlug}" aria-label="View ${escapeExploreText(item.title)}">
          <img src="${localImagePath(item.image)}" alt="${escapeExploreText(item.title)}" loading="lazy">
        </button>
        ${item.metRecord ? `<button type="button" class="favorite-button" data-favorite="${escapeExploreText(`met:${item.metRecord.metObjectID}`)}" aria-label="${isFavorite(`met:${item.metRecord.metObjectID}`) ? 'Remove from' : 'Add to'} favorites">${isFavorite(`met:${item.metRecord.metObjectID}`) ? '♥' : '♡'}</button>` : ''}
        <div><p>${escapeExploreText(item.subcategory ?? item.category)}${item.demonstration ? ' · Demonstration' : ''}${item.metRecord ? ' · The Met Open Access' : ''}</p>
          <h2>${escapeExploreText(item.title)}</h2>
          <div class="creator-line">${item.creatorImage ? `<img src="${localImagePath(item.creatorImage)}" alt="">` : ''}<span>${item.demonstration || item.creatorPublic ? `<a class="creator-profile-link" href="#creator/${creatorSlug(item.creator)}">${escapeExploreText(item.creator)}</a>` : escapeExploreText(item.creator)}</span></div>
          ${item.description ? `<p class="collection-description">${escapeExploreText(item.description)}</p>` : ''}
          ${item.date ? `<small class="collection-date">${escapeExploreText(item.date.slice(0, 10))}</small>` : ''}
          <button type="button" class="read-link" data-collection-detail="${item.id}" data-collection-slug="${collectionSlug}">${collectionSlug === 'literature' || collectionSlug === 'essays' ? 'Read more' : 'View details'} →</button>
        </div>
      </article>`).join('')
    : emptyState(activeSubcategory
      ? `No published ${activeSubcategory.title.toLowerCase()} currently have local images in this collection.`
      : term || category
        ? 'No items match these filters. Try another category or clear the search.'
        : 'No published works with local images are available in this collection yet.')

  grid.querySelectorAll<HTMLButtonElement>('[data-collection-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = collectionItems(collectionSlug).find((entry) => entry.id === Number(button.dataset.collectionDetail))
      if (item) openCollectionItemDetail(item, collectionSlug)
    })
  })
  grid.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      const id = button.dataset.favorite ?? ''
      const item = items.find((entry) => entry.metRecord && `met:${entry.metRecord.metObjectID}` === id)
      if (!item?.metRecord) return
      const active = toggleFavorite({
        id,
        title: item.title,
        artist: item.creator,
        category: item.category,
        image: item.image,
        metObjectID: item.metRecord.metObjectID,
      })
      button.textContent = active ? '♥' : '♡'
      button.setAttribute('aria-label', `${active ? 'Remove from' : 'Add to'} favorites`)
    })
  })
}

function openCollectionItemDetail(item: CollectionItem, collectionSlug: string) {
  const images = item.images?.length ? item.images : [item.image]
  const viewerRecords = item.metRecord
    ? metOpenAccessRecords.filter((record) => record.group === item.metRecord!.group)
    : []
  const viewerImages = item.metRecord ? viewerRecords.map((record) => record.localImage) : images
  const viewerCaptions = item.metRecord
    ? viewerRecords.map((record) => record.title)
    : viewerImages.map(() => item.title)
  const viewerIndex = item.metRecord
    ? Math.max(0, viewerImages.indexOf(item.metRecord.localImage))
    : 0
  const gallery = images.length > 1
    ? `<div class="detail-gallery"><img class="detail-main-image" data-viewer-index="${viewerIndex}" src="${localImagePath(images[0])}" alt="${escapeExploreText(item.title)}"><div>${images.map((image, index) => `<button type="button" data-gallery-image="${index}" aria-label="View image ${index + 1}"><img src="${localImagePath(image)}" alt=""></button>`).join('')}</div></div>`
    : `<img class="detail-main-image" data-viewer-index="${viewerIndex}" src="${localImagePath(images[0])}" alt="${escapeExploreText(item.title)}">`
  const details = [
    item.category ? ['Category', item.category] : undefined,
    item.subcategory ? ['Subcategory', item.subcategory] : undefined,
    item.style ? ['Style', item.style] : undefined,
    item.medium ? ['Medium / materials', item.medium] : undefined,
    item.dimensions ? ['Dimensions', item.dimensions] : undefined,
    item.date ? ['Date', item.date.slice(0, 10)] : undefined,
    item.metRecord ? ['Met object ID', String(item.metRecord.metObjectID)] : undefined,
    item.metRecord?.artistRole ? ['Creator role', item.metRecord.artistRole] : undefined,
    item.metRecord?.objectName ? ['Object type', item.metRecord.objectName] : undefined,
    item.metRecord?.department ? ['Department', item.metRecord.department] : undefined,
    item.metRecord?.classification ? ['Classification', item.metRecord.classification] : undefined,
    item.metRecord?.culture ? ['Culture', item.metRecord.culture] : undefined,
    item.metRecord?.period ? ['Period', item.metRecord.period] : undefined,
    item.metRecord?.country ? ['Country', item.metRecord.country] : undefined,
    item.metRecord?.region ? ['Region', item.metRecord.region] : undefined,
    item.metRecord?.creditLine ? ['Credit line', item.metRecord.creditLine] : undefined,
    item.metRecord ? ['Open Access', 'Public domain · CC0 1.0'] : undefined,
  ].filter((entry): entry is string[] => Boolean(entry))
  const detailsMarkup = details.length
    ? `<dl class="artwork-facts">${details.map(([label, value]) => `<div><dt>${escapeExploreText(label)}</dt><dd>${escapeExploreText(value)}</dd></div>`).join('')}</dl>`
    : ''
  const publicContent = item.content && item.content !== item.description
    ? `<section class="public-work-content"><h3>Public content</h3><p>${escapeExploreText(item.content)}</p></section>`
    : ''
  const context = item.background
    ? `<section class="public-work-content"><h3>Background</h3><p>${escapeExploreText(item.background)}</p></section>`
    : ''
  const metAttribution = item.metRecord
    ? `<section class="public-work-content met-attribution">
        <h3>The Metropolitan Museum of Art · Open Access</h3>
        <p>This public-domain museum artwork is presented as a collection item, not offered for sale by ArtHive. The Met does not endorse ArtHive.</p>
        <p><a href="${escapeExploreText(item.metRecord.objectURL)}" target="_blank" rel="noopener noreferrer">Official Met collection record</a> ·
          <a href="${escapeExploreText(item.metRecord.originalImageURL)}" target="_blank" rel="noopener noreferrer">Original museum image source</a> ·
          <a href="${escapeExploreText(item.metRecord.openAccessSource)}" target="_blank" rel="noopener noreferrer">Open Access information</a> ·
          <a href="${escapeExploreText(item.metRecord.licenseURL)}" target="_blank" rel="noopener noreferrer">CC0 1.0 license</a>
        </p>
        <a class="primary-button" href="${escapeExploreText(item.metRecord.objectURL)}" target="_blank" rel="noopener noreferrer">Explore Original at The Met <span>→</span></a>
      </section>`
    : ''
  const creator = item.demonstration || item.creatorPublic
    ? `<a class="creator-profile-link" href="#creator/${creatorSlug(item.creator)}">${escapeExploreText(item.creator)} · View creator profile</a>`
    : escapeExploreText(item.creator)
  const detailContent = document.querySelector<HTMLDivElement>('#detailContent')!
  detailContent.dataset.viewerImages = JSON.stringify(viewerImages)
  detailContent.dataset.viewerCaptions = JSON.stringify(viewerCaptions)
  detailContent.innerHTML = `${gallery}<div class="detail-copy">
    <p class="eyebrow">${escapeExploreText(collectionSlug)}</p>
    <h2>${escapeExploreText(item.title)}</h2>
    <p>By ${creator}</p>
    ${item.description ? `<p>${escapeExploreText(item.description)}</p>` : ''}
    ${detailsMarkup}${context}${publicContent}
    ${item.metRecord?.artistBio ? `<p>${escapeExploreText(item.metRecord.artistBio)}</p>` : ''}
    ${metAttribution}
    ${item.demonstration ? '<p class="demo-notice">Fictional demonstration content. Creator attribution and work details are samples, not historical claims.</p>' : ''}
    ${item.creatorBio && item.creatorPublic ? `<p>${escapeExploreText(item.creatorBio)}</p>` : ''}
    ${item.creatorVerified ? '<p class="creator-verification">Verified creator</p>' : ''}
  </div>`
  attachLocalRating(
    detailContent.querySelector<HTMLElement>('.detail-copy')!,
    item.metRecord ? `met:${item.metRecord.metObjectID}` : `${collectionSlug}:${item.id}`,
  )
  detailDialog.showModal()
  detailContent.querySelectorAll<HTMLButtonElement>('[data-gallery-image]').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const index = Number(thumb.dataset.galleryImage)
      const image = images[index]
      const mainImage = detailContent.querySelector<HTMLImageElement>('.detail-main-image')
      if (image && mainImage) {
        mainImage.src = localImagePath(image)
      mainImage.dataset.viewerIndex = String(item.metRecord ? viewerIndex : index)
      }
    })
  })
}

function creatorSlug(name: string) {
  return name.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

type CreatorProfileData = {
  name: string
  image?: string
  bio?: string
  verified?: boolean
  demonstration?: boolean
  works: Array<{ title: string; image: string; category: string; collection: string }>
}

function availableCreatorProfiles(): CreatorProfileData[] {
  const creators = new Map<string, CreatorProfileData>()
  const addWork = (name: string, title: string, image: string, category: string, collection: string, profile?: { avatar_url?: string | null; bio?: string | null; verified?: boolean; public_profile?: boolean }) => {
    if (!name || name.startsWith('Unknown ') || profile?.public_profile === false) return
    const key = creatorSlug(name)
    if (!key) return
    let creator = creators.get(key)
    if (!creator) {
      creator = {
        name,
        image: profile?.avatar_url ?? undefined,
        bio: profile?.bio ?? undefined,
        verified: profile?.verified === true,
        demonstration: name === 'ArtHive Demonstration Collection',
        works: [],
      }
      creators.set(key, creator)
    }
    creator.works.push({ title, image, category, collection })
  }

  artworks.forEach((item) => addWork(item.artist, item.title, item.image, item.category, 'artworks', {
    avatar_url: item.creatorImage,
    bio: item.creatorBio,
    verified: item.creatorVerified,
    public_profile: item.creatorPublic,
  }))
  literature.forEach((item) => addWork(item.author, item.title, item.image, item.type, 'literature', {
    avatar_url: item.authorImage,
    bio: item.authorBio,
    public_profile: item.authorPublic,
  }))
  essays.forEach((item) => addWork(item.profiles?.display_name ?? '', item.title ?? '', item.cover_url ?? '', item.category ?? 'Essay', 'essays', item.profiles))
  sculptures.forEach((item) => {
    const image = (item.sculpture_images ?? [])[0]?.image_url ?? ''
    addWork(item.profiles?.display_name ?? '', item.title ?? '', image, item.category ?? 'Sculpture', 'sculptures', item.profiles)
  })

  if (!isSupabaseConfigured && !creators.has('arthive-demonstration-collection')) {
    const demo = {
      name: 'ArtHive Demonstration Collection',
      demonstration: true,
      works: [
        ...demoArtworks.map((item) => ({ title: item.title, image: item.image, category: item.category, collection: 'artworks' })),
        ...demoLiterature.map((item) => ({ title: item.title, image: item.image, category: item.type, collection: 'literature' })),
        ...demoEssays.map((item) => ({ title: item.title, image: item.cover_url, category: item.category, collection: 'essays' })),
        ...demoSculptures.map((item) => ({ title: item.title, image: item.sculpture_images[0].image_url, category: item.category, collection: 'sculptures' })),
      ],
    }
    creators.set('arthive-demonstration-collection', demo)
  }
  return [...creators.values()]
}

function renderCreatorDirectory() {
  const grid = document.querySelector<HTMLDivElement>('#creatorDirectoryGrid')!
  const creators = availableCreatorProfiles()
  grid.innerHTML = creators.length ? creators.map((creator) => {
    const image = creator.image ? localImagePath(creator.image) : ''
    return `<a class="creator-directory-card" href="#creator/${creatorSlug(creator.name)}">
      ${image && image !== fallbackImagePath ? `<img src="${image}" alt="">` : '<span class="creator-directory-avatar" aria-hidden="true">AH</span>'}
      <span class="eyebrow">${creator.demonstration ? 'Demonstration profile' : creator.verified ? 'Verified creator' : 'Public creator'}</span>
      <strong>${creator.name}</strong><small>${creator.works.length} portfolio item${creator.works.length === 1 ? '' : 's'}</small>
    </a>`
  }).join('') : emptyState('Public creator profiles will appear when published works are available.')
}

function renderCreatorProfile(routeSlug: string) {
  const creator = availableCreatorProfiles().find((item) => creatorSlug(item.name) === routeSlug)
  const root = document.querySelector<HTMLDivElement>('#creatorProfileContent')!
  if (!creator) {
    root.innerHTML = `<a class="arrow-link" href="#explore">← Explore the museum</a>${emptyState('This public creator profile is not available.')}`
    return
  }
  const image = creator.image ? localImagePath(creator.image) : ''
  const title = creator.demonstration ? 'Demonstration creator profile' : creator.verified ? 'Verified creator' : 'Public creator profile'
  root.innerHTML = `
    <a class="arrow-link" href="#explore">← Explore the museum</a>
    <div class="creator-profile-hero">
      ${image && image !== fallbackImagePath ? `<img class="creator-profile-photo" src="${image}" alt="Public profile photo of ${creator.name}">` : `<div class="creator-profile-mark" aria-hidden="true">${creator.demonstration ? 'AH' : creator.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>`}
      <div><p class="eyebrow">${title}</p><h1>${creator.name}</h1><p>${creator.demonstration
        ? 'Fictional collective attribution used only to present original local sample content. This is not a real person or a verified creator profile.'
        : creator.bio || 'No public biography has been provided.'}</p></div>
    </div>
    <div class="creator-profile-tabs" role="tablist" aria-label="Creator profile sections">
      <a href="#creatorWorks">Portfolio</a><a href="#creatorBackground">Background</a><a href="#creatorContact">Contact</a>
    </div>
    <section class="creator-profile-section" id="creatorWorks"><p class="eyebrow">Portfolio</p><h2>Published works</h2><p>${creator.demonstration ? 'Original local sample illustrations and writing created for the ArtHive application preview.' : 'Works available in the public ArtHive collections.'}</p>
      <div class="creator-works-grid">${creator.works.map((work) => `<a class="creator-work-card" href="#collection/${work.collection}"><img src="${localImagePath(work.image)}" alt="${work.category} portfolio item" loading="lazy"><span>${work.category}</span><strong>${work.title || 'View collection item'}</strong></a>`).join('')}</div>
    </section>
    <section class="creator-profile-section creator-profile-muted" id="creatorBackground"><p class="eyebrow">Background and achievements</p><h2>${creator.demonstration ? 'No personal claims' : 'Creator information'}</h2><p>${creator.demonstration
      ? 'This fictional demonstration identity has no education, employment, awards, exhibition history, or biography.'
      : 'Education, specializations, experience, awards, and exhibitions are not displayed unless the creator has provided public details.'}</p></section>
    <section class="creator-profile-section" id="creatorContact"><p class="eyebrow">Public contact</p><h2>Contact information</h2><p>Public contact details and social links have not been provided for this profile.</p></section>
    <p class="review-unavailable">Ratings and reviews are not displayed here because no approved persistent review source is configured.</p>`
}

let founderContent: FounderContent | null = null

function escapeFounderText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function safeFounderImage(value: string | null) {
  if (!value) return ''
  const imagePath = localImagePath(value)
  return imagePath === fallbackImagePath ? '' : imagePath
}

function founderContactHref(contact: FounderContact) {
  if (contact.channel === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value) ? `mailto:${contact.value}` : ''
  }
  try {
    const url = new URL(contact.value)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function renderFounderPage(data: FounderContent) {
  const root = document.querySelector<HTMLDivElement>('#founderContent')!
  const profile = data.profile
  const portraitUrl = data.profileImage ? safeFounderImage(data.profileImage) : ''
  const portrait = portraitUrl
    ? `<img src="${escapeFounderText(portraitUrl)}" alt="Portrait of ${escapeFounderText(profile.full_name)}">`
    : `<div class="founder-portrait-placeholder" aria-label="Founder photograph not yet provided"><span>HM</span><small>Founder photograph<br>not yet provided</small></div>`
  const projectStatus: Record<FounderProject['status'], string> = {
    concept: 'Concept',
    prototype: 'Prototype',
    functional: 'Functional system',
  }

  root.innerHTML = `
    <section class="founder-hero">
      <div class="founder-portrait">${portrait}<span class="founder-seal">Founder<br>&amp; Owner</span></div>
      <div class="founder-intro">
        <p class="eyebrow">Meet the founder</p>
        <h1 id="founderName">${escapeFounderText(profile.full_name)}</h1>
        <p class="founder-title">${escapeFounderText(profile.title)}</p>
        <p class="founder-lede">${escapeFounderText(profile.biography)}</p>
        <div class="founder-actions">
          <a class="primary-button" href="https://personalportfolio-kohl-zeta.vercel.app/" target="_blank" rel="noopener noreferrer">Explore My Personal Portfolio <span>↗</span></a>
          <a class="outline-button dark" href="#founderProjects">Explore projects</a>
        </div>
        <p class="founder-note">An IT student learning, building, and finding her place in the digital world.</p>
      </div>
    </section>

    <section class="founder-section founder-about">
      <div><p class="eyebrow">About the founder</p><h2>Technology with<br><em>people at the heart.</em></h2></div>
      <div>
        <p>Honeylyn A. Moreno is an Information Technology student and aspiring digital innovator interested in combining technology, creativity, and continuous learning. She is exploring web and application development, digital tools, and artificial intelligence while appreciating the role of arts, literature, and cultural heritage in bringing communities together.</p>
        <p>Her current learning includes HTML, CSS, JavaScript, responsive design, online research, and documentation. She values problem-solving and hopes to contribute to useful, accessible digital experiences as her knowledge and practical skills grow.</p>
      </div>
    </section>

    <section class="founder-section founder-education">
      <p class="eyebrow">Educational background</p><h2>Learning for what’s next.</h2>
      <article><span class="founder-education-mark">✳</span><div><h3>${escapeFounderText(profile.education)}</h3><p>${escapeFounderText(profile.university)}</p><p>Her academic and technical learning is ongoing, with interests in software development, digital technologies, information systems, and building practical skills. No graduation date or completed qualification is claimed.</p></div></article>
    </section>

    <section class="founder-section founder-story">
      <p class="eyebrow">The Story Behind ArtHive: Turning Creativity into a Digital Experience</p>
      <h2>Where creativity meets<br><em>culture and opportunity.</em></h2>
      <p>${escapeFounderText(profile.founder_story)}</p>
      <div class="founder-story-points">
        <article><span>01</span><h3>Showcase</h3><p>A place for artists to present creative works.</p></article>
        <article><span>02</span><h3>Share</h3><p>Space for authors and writers to share publications.</p></article>
        <article><span>03</span><h3>Discover</h3><p>Help visitors explore artworks and literary collections.</p></article>
        <article><span>04</span><h3>Connect</h3><p>Make it easier for buyers and collectors to find creators.</p></article>
        <article><span>05</span><h3>Preserve</h3><p>Support appreciation and preservation of cultural expression.</p></article>
      </div>
      <p class="founder-disclaimer">ArtHive is a developing digital museum and marketplace concept; its features and content evolve over time.</p>
    </section>

    <section class="founder-section founder-vision">
      <p class="eyebrow">Proposed personal statements${profile.statements_approved ? ' · approved by the founder' : ' · awaiting founder approval'}</p>
      <div><article><span>Personal vision</span><p>${escapeFounderText(profile.vision)}</p></article><article><span>Personal mission</span><p>${escapeFounderText(profile.mission)}</p></article></div>
      <h3>Core values</h3><div class="founder-pills">${['Creativity', 'Innovation', 'Continuous Learning', 'Integrity', 'Accessibility', 'Collaboration', 'Cultural Appreciation', 'Community Empowerment'].map((value) => `<span>${value}</span>`).join('')}</div>
    </section>

    <section class="founder-section">
      <div class="section-heading"><div><p class="eyebrow">Technical interests and skills</p><h2>Growing, one skill at a time.</h2></div></div>
      <p class="founder-skills-intro">These labels reflect developing competencies and interests, not professional certification.</p>
      <div class="founder-skill-grid">${data.skills.map((skill) => `<article><strong>${escapeFounderText(skill.name)}</strong><span>${escapeFounderText(skill.status)}</span><small>${escapeFounderText(skill.category)}</small></article>`).join('')}</div>
      <div class="founder-pills founder-additional-interests">${['HTML5', 'CSS3', 'JavaScript', 'Responsive Web Design', 'UI and UX Design', 'Web Application Development', 'Database Management', 'Artificial Intelligence', 'Digital Research', 'Technical Documentation'].map((value) => `<span>${value} · Interest</span>`).join('')}</div>
    </section>

    <section class="founder-projects-section" id="founderProjects">
      <div class="section-heading"><div><p class="eyebrow">Other projects and experiences</p><h2>Learning by making.</h2></div><p>Project ideas shared honestly, with room to grow.</p></div>
      <div class="founder-project-grid">${data.projects.map((project, index) => {
    const image = safeFounderImage(project.image)
    return `<article class="founder-project-card">
          <div class="founder-project-art ${image ? 'has-image' : ''}">
            ${image ? `<img src="${escapeFounderText(image)}" alt="Approved project image for ${escapeFounderText(project.title)}">` : `<span class="founder-project-number">0${index + 1}</span><strong>${escapeFounderText(project.title)}</strong><small>PROJECT CONCEPT</small>`}
            <span class="founder-project-status">${projectStatus[project.status]}</span>
          </div>
          <div class="founder-project-copy"><p class="eyebrow">${escapeFounderText(project.category)}</p><h3>${escapeFounderText(project.title)}</h3><p>${escapeFounderText(project.description)}</p>
            <p class="founder-project-role">${escapeFounderText(project.role)}</p>
            <p class="founder-technologies">${project.technologies.length ? `<strong>Verified technologies:</strong> ${project.technologies.map(escapeFounderText).join(', ')}` : 'No project-specific technologies have been verified.'}</p>
            <details class="founder-project-details"><summary>View Project Details</summary><p>${escapeFounderText(project.description)}</p><p><strong>Status:</strong> ${projectStatus[project.status]}. <strong>Role:</strong> ${escapeFounderText(project.role)}.</p></details>
          </div>
        </article>`
  }).join('')}</div>
      <p class="founder-disclaimer">The personal portfolio describes these visuals as concept illustrations, not project screenshots. A card marked “Concept” is not a completed functional system.</p>
    </section>

    <section class="founder-section founder-learning">
      <div><p class="eyebrow">A learning journey, not a finished story</p><h2>Still learning.<br><em>Always moving.</em></h2><p>No employment history, academic awards, certifications, or testimonials are claimed here. Honeylyn describes her journey as ongoing.</p></div>
      <ol><li><span>01</span><strong>Study the fundamentals</strong></li><li><span>02</span><strong>Build, test, improve</strong></li><li><span>03</span><strong>Keep showing up</strong></li></ol>
    </section>

    <section class="founder-contact-section">
      <div><p class="eyebrow">Personal portfolio and professional connections</p><h2>Let’s connect<br><em>and grow together.</em></h2><p>Open to learning, thoughtful collaborations, and opportunities to grow.</p><a class="primary-button" href="https://personalportfolio-kohl-zeta.vercel.app/" target="_blank" rel="noopener noreferrer">Explore My Personal Portfolio <span>↗</span></a></div>
      <div class="founder-contact-list">${data.contacts.map((contact) => {
    const href = founderContactHref(contact)
    return `<a href="${escapeFounderText(href || '#')}" ${contact.channel === 'website' && href ? 'target="_blank" rel="noopener noreferrer"' : ''} ${href ? '' : 'aria-disabled="true"'}><span>${escapeFounderText(contact.label)}</span><strong>${escapeFounderText(contact.value)}</strong><span aria-hidden="true">↗</span></a>`
  }).join('')}</div>
    </section>`

  root.hidden = false
  document.querySelector<HTMLElement>('#founderStatus')!.hidden = true
  document.querySelector<HTMLElement>('#founderAdmin')!.hidden = !data.canManage
  if (data.canManage) renderFounderAdmin(data)
}

function renderFounderAdmin(data: FounderContent) {
  const profileForm = document.querySelector<HTMLFormElement>('#founderProfileForm')!
  for (const field of ['full_name', 'title', 'education', 'university', 'biography', 'founder_story'] as const) {
    ;(profileForm.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement).value = data.profile[field]
  }
  ;(profileForm.elements.namedItem('interests') as HTMLTextAreaElement).value = data.profile.interests.join('\n')
  ;(profileForm.elements.namedItem('aspirations') as HTMLTextAreaElement).value = data.profile.aspirations.join('\n')
  ;(profileForm.elements.namedItem('profile_image_path') as HTMLInputElement).value = data.profile.profile_image_path ?? ''
  const statements = document.querySelector<HTMLFormElement>('#founderStatementsForm')!
  ;(statements.elements.namedItem('vision') as HTMLTextAreaElement).value = data.profile.vision
  ;(statements.elements.namedItem('mission') as HTMLTextAreaElement).value = data.profile.mission
  ;(statements.elements.namedItem('statements_approved') as HTMLInputElement).checked = data.profile.statements_approved
  ;(document.querySelector<HTMLTextAreaElement>('#founderSkillsInput')!).value = data.skills.map((skill) => `${skill.name} | ${skill.status} | ${skill.category}`).join('\n')
  ;(document.querySelector<HTMLTextAreaElement>('#founderContactsInput')!).value = data.contacts.map((contact) => `${contact.key} | ${contact.label} | ${contact.channel} | ${contact.value}`).join('\n')
  const editor = document.querySelector<HTMLDivElement>('#founderProjectEditor')!
  editor.innerHTML = data.projects.map(founderProjectEditor).join('')
  editor.querySelectorAll<HTMLFormElement>('[data-founder-project-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      void saveFounderProjectForm(form)
    })
  })
  editor.querySelectorAll<HTMLButtonElement>('[data-founder-project-archive]').forEach((button) => {
    button.addEventListener('click', () => void archiveFounderProject(button.dataset.founderProjectArchive ?? ''))
  })
}

function founderProjectEditor(project: Partial<FounderProject>) {
  const isNew = !project.slug
  return `<details class="founder-project-edit"><summary>${isNew ? 'New project' : escapeFounderText(project.title ?? '')}</summary><form data-founder-project-form="${isNew ? 'new' : escapeFounderText(project.slug ?? '')}">
    <label>Project title<input name="title" value="${escapeFounderText(project.title ?? '')}" required maxlength="120"></label>
    <label>Project slug<input name="slug" value="${escapeFounderText(project.slug ?? '')}" required pattern="[a-z0-9-]+" maxlength="90" ${isNew ? '' : 'readonly'}></label>
    <label>Category<input name="category" value="${escapeFounderText(project.category ?? '')}" required maxlength="80"></label>
    <label>Role (only if confirmed)<input name="role" value="${escapeFounderText(project.role ?? '')}" required maxlength="120"></label>
    <label>Description<textarea name="description" rows="3" maxlength="800" required>${escapeFounderText(project.description ?? '')}</textarea></label>
    <label>Verified technologies (comma separated)<input name="technologies" value="${escapeFounderText(project.technologies?.join(', ') ?? '')}" maxlength="300"></label>
    <label>Local image path<input name="image_path" value="${escapeFounderText(project.image_path ?? '')}" placeholder="/assets/images/founder/project-image.jpg" pattern="/assets/images/.*"></label>
    <label>Status<select name="status"><option value="concept" ${project.status === 'concept' ? 'selected' : ''}>Concept</option><option value="prototype" ${project.status === 'prototype' ? 'selected' : ''}>Prototype</option><option value="functional" ${project.status === 'functional' ? 'selected' : ''}>Functional system</option></select></label>
    <button class="primary-button" type="submit">Save project</button>
    ${!isNew ? `<button class="read-link" type="button" data-founder-project-archive="${escapeFounderText(project.slug!)}">Archive project</button>` : ''}
    <p role="status"></p></form></details>`
}

async function renderFounderScreen() {
  const status = document.querySelector<HTMLElement>('#founderStatus')!
  const root = document.querySelector<HTMLDivElement>('#founderContent')!
  status.hidden = false
  status.textContent = 'Loading founder profile…'
  root.hidden = true
  try {
    founderContent = await loadFounderContent()
    renderFounderPage(founderContent)
    if (founderContent.canManage) void loadLocalAssets()
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Founder profile could not be loaded.'
  }
}

document.querySelector<HTMLFormElement>('#founderProfileForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const data = new FormData(form)
  const status = document.querySelector<HTMLParagraphElement>('#founderProfileStatus')!
  const profileImagePath = String(data.get('profile_image_path') ?? '').trim()
  if (profileImagePath && !isAllowedImageReference(profileImagePath)) {
    status.textContent = 'Use a local project path under /assets/images/.'
    return
  }
  status.textContent = 'Saving…'
  try {
    await saveFounderProfile({
      full_name: String(data.get('full_name') ?? '').trim(),
      title: String(data.get('title') ?? '').trim(),
      education: String(data.get('education') ?? '').trim(),
      university: String(data.get('university') ?? '').trim(),
      biography: String(data.get('biography') ?? '').trim(),
      founder_story: String(data.get('founder_story') ?? '').trim(),
      interests: String(data.get('interests') ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      aspirations: String(data.get('aspirations') ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      profile_image_path: profileImagePath || null,
    })
    await renderFounderScreen()
    document.querySelector('#founderProfileStatus')!.textContent = 'Founder profile saved.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Founder profile could not be saved.'
  }
})

type LocalAsset = {
  category: string
  name: string
  path: string
  managed: boolean
  createdAt: string
}

async function loadLocalAssets() {
  const status = document.querySelector<HTMLElement>('#localAssetStatus')
  const list = document.querySelector<HTMLDivElement>('#localAssetList')
  const fileInput = document.querySelector<HTMLInputElement>('#localAssetFile')
  if (!status || !list || !fileInput) return
  if (!import.meta.env.DEV) {
    fileInput.disabled = true
    status.textContent = 'Local image changes are available only in the development server. Vercel deployments cannot persist project-file uploads.'
    list.replaceChildren()
    return
  }
  status.textContent = 'Loading project image files…'
  try {
    const response = await fetch('/__arthive/local-assets')
    const result = await response.json() as { assets?: LocalAsset[]; error?: string }
    if (!response.ok) throw new Error(result.error ?? `Local asset list failed (${response.status}).`)
    const category = document.querySelector<HTMLSelectElement>('#localAssetCategory')!.value
    const assets = (result.assets ?? []).filter((asset) => asset.category === category)
    list.replaceChildren()
    if (!assets.length) {
      status.textContent = 'No images are in this category yet.'
      return
    }
    status.textContent = `${assets.length} image${assets.length === 1 ? '' : 's'} in ${category}.`
    for (const asset of assets) {
      const row = document.createElement('article')
      row.className = 'local-asset-row'
      const image = document.createElement('img')
      image.src = asset.path
      image.alt = ''
      image.loading = 'lazy'
      const path = document.createElement('code')
      path.textContent = asset.path
      const copy = document.createElement('button')
      copy.type = 'button'
      copy.className = 'read-link'
      copy.textContent = 'Copy path'
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(asset.path)
          status.textContent = `Copied ${asset.path}`
        } catch (error) {
          status.textContent = error instanceof Error ? `Could not copy path: ${error.message}` : 'Could not copy image path.'
        }
      })
      row.append(image, path, copy)
      if (asset.managed) {
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'read-link'
        remove.textContent = 'Delete'
        remove.addEventListener('click', async () => {
          if (!confirm(`Delete the local image ${asset.name}?`)) return
          remove.disabled = true
          try {
            const query = new URLSearchParams({ category: asset.category, name: asset.name })
            const deleteResponse = await fetch(`/__arthive/local-assets?${query}`, { method: 'DELETE' })
            const deletion = await deleteResponse.json() as { error?: string }
            if (!deleteResponse.ok) throw new Error(deletion.error ?? `Delete failed (${deleteResponse.status}).`)
            await loadLocalAssets()
          } catch (error) {
            remove.disabled = false
            status.textContent = error instanceof Error ? error.message : 'Local image could not be deleted.'
          }
        })
        row.append(remove)
      }
      list.append(row)
    }
  } catch (error) {
    status.textContent = error instanceof Error
      ? `${error.message} Start ArtHive with npm run dev to manage local assets.`
      : 'Local project assets could not be loaded.'
  }
}

document.querySelector<HTMLSelectElement>('#localAssetCategory')?.addEventListener('change', () => {
  void loadLocalAssets()
})

document.querySelector<HTMLInputElement>('#localAssetFile')?.addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const status = document.querySelector<HTMLElement>('#localAssetStatus')!
  const preview = document.querySelector<HTMLImageElement>('#localAssetPreview')!
  const previewUrl = URL.createObjectURL(file)
  preview.src = previewUrl
  preview.hidden = false
  if (!import.meta.env.DEV) {
    status.textContent = 'Uploads are disabled in production. Add approved files to the project and redeploy.'
    input.value = ''
    return
  }
  const category = document.querySelector<HTMLSelectElement>('#localAssetCategory')!.value
  input.disabled = true
  status.textContent = 'Saving the image to the local ArtHive project…'
  try {
    const query = new URLSearchParams({ category, name: file.name })
    const response = await fetch(`/__arthive/local-assets?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    const result = await response.json() as { path?: string; error?: string }
    if (!response.ok || !result.path) throw new Error(result.error ?? `Local upload failed (${response.status}).`)
    status.textContent = `Saved locally as ${result.path}. Copy this path into the related image field and save that record.`
    preview.src = result.path
    await loadLocalAssets()
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Image could not be saved to the local project.'
  } finally {
    URL.revokeObjectURL(previewUrl)
    input.disabled = false
    input.value = ''
  }
})

document.querySelector<HTMLFormElement>('#founderStatementsForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const data = new FormData(form)
  const status = document.querySelector<HTMLParagraphElement>('#founderStatementsStatus')!
  status.textContent = 'Saving…'
  try {
    await saveFounderProfile({
      vision: String(data.get('vision') ?? '').trim(),
      mission: String(data.get('mission') ?? '').trim(),
      statements_approved: data.has('statements_approved'),
    })
    await renderFounderScreen()
    document.querySelector('#founderStatementsStatus')!.textContent = 'Vision and mission saved.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Statements could not be saved.'
  }
})

document.querySelector<HTMLFormElement>('#founderSkillsForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const status = document.querySelector<HTMLParagraphElement>('#founderSkillsStatus')!
  try {
    const rows = String(new FormData(form).get('skills') ?? '').split(/\r?\n/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
    const skills = rows.map(([name, state, category]) => {
      const normalizedStatus = ['learning', 'developing', 'practicing', 'exploring'].find((value) => value === state?.toLowerCase())
      if (!name || !normalizedStatus || !category) {
        throw new Error('Each skill needs a name, valid learning status, and category.')
      }
      return {
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        name,
        status: normalizedStatus[0].toUpperCase() + normalizedStatus.slice(1),
        category,
      }
    })
    if (skills.some((skill) => !skill.slug)) throw new Error('Each skill needs a valid name.')
    await saveFounderSkills(skills)
    await renderFounderScreen()
    document.querySelector('#founderSkillsStatus')!.textContent = 'Skills saved.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Skills could not be saved.'
  }
})

document.querySelector('#founderAddProject')?.addEventListener('click', () => {
  const editor = document.querySelector<HTMLDivElement>('#founderProjectEditor')!
  editor.insertAdjacentHTML('beforeend', founderProjectEditor({ status: 'concept', technologies: [] }))
  const form = editor.lastElementChild?.querySelector<HTMLFormElement>('[data-founder-project-form="new"]')
  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    void saveFounderProjectForm(form)
  })
})

document.querySelector<HTMLFormElement>('#founderContactsForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const status = document.querySelector<HTMLParagraphElement>('#founderContactsStatus')!
  try {
    const rows = String(new FormData(form).get('contacts') ?? '').split(/\r?\n/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
    const contacts: Array<Pick<FounderContact, 'key' | 'label' | 'channel' | 'value'>> = rows.map(([key, label, channel, value]) => {
      if (!key || !/^[a-z0-9-]+$/.test(key) || !label || !value || !['email', 'website'].includes(channel ?? '')) {
        throw new Error('Each contact needs a key, label, email or website channel, and value.')
      }
      if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error(`${label} must be a valid email address.`)
      }
      if (channel === 'website' && !/^https:\/\//i.test(value)) {
        throw new Error(`${label} must use a secure https:// link.`)
      }
      return { key, label, channel: channel!, value }
    })
    await saveFounderContacts(contacts)
    await renderFounderScreen()
    document.querySelector('#founderContactsStatus')!.textContent = 'Contact links saved.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Contact links could not be saved.'
  }
})

async function saveFounderProjectForm(form: HTMLFormElement) {
  const status = form.querySelector<HTMLParagraphElement>('[role="status"]')!
  const data = new FormData(form)
  const slug = String(data.get('slug') ?? '').trim()
  const imagePath = String(data.get('image_path') ?? '').trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    status.textContent = 'Use a lowercase slug with letters, numbers, and hyphens.'
    return
  }
  if (imagePath && !isAllowedImageReference(imagePath)) {
    status.textContent = 'Use a local project path under /assets/images/.'
    return
  }
  try {
    const projects = (founderContent?.projects ?? []).filter((project) => project.slug !== slug)
    projects.push({
      id: slug,
      slug,
      title: String(data.get('title') ?? '').trim(),
      description: String(data.get('description') ?? '').trim(),
      category: String(data.get('category') ?? '').trim(),
      role: String(data.get('role') ?? '').trim(),
      technologies: String(data.get('technologies') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      status: String(data.get('status') ?? 'concept') as FounderProject['status'],
      image_path: imagePath || null,
      sort_order: projects.length + 1,
      image: imagePath || null,
    })
    await saveFounderProjects(projects)
    await renderFounderScreen()
    document.querySelector('#founderProjectsStatus')!.textContent = 'Project saved.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Project could not be saved.'
  }
}

async function archiveFounderProject(slug: string) {
  if (!founderContent || !confirm('Archive this project from the public founder profile?')) return
  try {
    await saveFounderProjects(founderContent.projects.filter((project) => project.slug !== slug))
    await renderFounderScreen()
    document.querySelector('#founderProjectsStatus')!.textContent = 'Project archived.'
  } catch (error) {
    document.querySelector('#founderProjectsStatus')!.textContent = error instanceof Error ? error.message : 'Project could not be archived.'
  }
}

function handleCollectionRoute() {
  const hash = location.hash
  const homeScreen = document.querySelector<HTMLElement>('#homeScreen')!
  const exploreScreen = document.querySelector<HTMLElement>('#exploreScreen')!
  const collectionScreen = document.querySelector<HTMLElement>('#collectionScreen')!
  const favoritesScreen = document.querySelector<HTMLElement>('#favoritesScreen')!
  const creatorScreen = document.querySelector<HTMLElement>('#creatorScreen')!
  const founderScreen = document.querySelector<HTMLElement>('#founderScreen')!
  const assistantScreen = document.querySelector<HTMLElement>('#assistantScreen')!
  const footer = document.querySelector<HTMLElement>('footer')!
  const launcher = document.querySelector<HTMLElement>('#assistantLauncher')!
  const bottomNav = document.querySelector<HTMLElement>('.app-bottom-nav')!

  if (hash === '#explore') {
    homeScreen.hidden = true
    exploreScreen.hidden = false
    collectionScreen.hidden = true
    favoritesScreen.hidden = true
    creatorScreen.hidden = true
    founderScreen.hidden = true
    assistantScreen.hidden = true
    footer.hidden = false
    launcher.hidden = false
    bottomNav.hidden = false
    renderExploreScreen()
  } else if (hash.startsWith('#collection/')) {
    const slug = hash.replace('#collection/', '')
    homeScreen.hidden = true
    exploreScreen.hidden = true
    collectionScreen.hidden = false
    favoritesScreen.hidden = true
    creatorScreen.hidden = true
    founderScreen.hidden = true
    assistantScreen.hidden = true
    footer.hidden = false
    launcher.hidden = false
    bottomNav.hidden = false
    renderCollectionScreen(slug)
  } else if (hash === '#favorites') {
    homeScreen.hidden = true
    exploreScreen.hidden = true
    collectionScreen.hidden = true
    favoritesScreen.hidden = false
    creatorScreen.hidden = true
    founderScreen.hidden = true
    assistantScreen.hidden = true
    footer.hidden = false
    launcher.hidden = false
    bottomNav.hidden = false
    renderFavoritesScreen()
  } else if (hash.startsWith('#creator/')) {
    homeScreen.hidden = true
    exploreScreen.hidden = true
    collectionScreen.hidden = true
    favoritesScreen.hidden = true
    creatorScreen.hidden = false
    founderScreen.hidden = true
    assistantScreen.hidden = true
    footer.hidden = false
    launcher.hidden = false
    bottomNav.hidden = false
    renderCreatorProfile(hash.slice('#creator/'.length))
  } else if (hash === '#founder') {
    homeScreen.hidden = true
    exploreScreen.hidden = true
    collectionScreen.hidden = true
    favoritesScreen.hidden = true
    creatorScreen.hidden = true
    founderScreen.hidden = false
    assistantScreen.hidden = true
    footer.hidden = false
    launcher.hidden = false
    bottomNav.hidden = false
    void renderFounderScreen()
  } else if (hash === '#ai') {
    homeScreen.hidden = true
    exploreScreen.hidden = true
    collectionScreen.hidden = true
    favoritesScreen.hidden = true
    creatorScreen.hidden = true
    founderScreen.hidden = true
    assistantScreen.hidden = false
    footer.hidden = true
    launcher.hidden = true
    bottomNav.hidden = true
    initializeAssistant()
  } else {
    homeScreen.hidden = false
    exploreScreen.hidden = true
    collectionScreen.hidden = true
    favoritesScreen.hidden = true
    creatorScreen.hidden = true
    founderScreen.hidden = true
    assistantScreen.hidden = true
    footer.hidden = false
    launcher.hidden = false
    bottomNav.hidden = false
  }
}

let assistantInitialized = false
let assistantSessionId: string = crypto.randomUUID()
let assistantMessages: AssistantMessage[] = []
let assistantSuggestions: string[] = []
let assistantConfigLoaded = false

function assistantMessageElement(message: AssistantMessage, results: AssistantResult[] = []) {
  const article = document.createElement('article')
  article.className = `assistant-message assistant-message-${message.role}`
  const label = document.createElement('span')
  label.className = 'assistant-message-label'
  label.textContent = message.role === 'assistant' ? 'ArtHive AI' : 'You'
  const content = document.createElement('p')
  content.textContent = message.content
  article.append(label, content)

  if (results.length) {
    const cards = document.createElement('div')
    cards.className = 'assistant-result-cards'
    for (const result of results) {
      const card = document.createElement('a')
      card.className = 'assistant-result-card'
      card.href = /^#collection\/(artworks|literature|essays|sculptures)$/.test(result.href) ? result.href : '#explore'
      const imageUrl = result.image
      if (imageUrl) {
        const image = document.createElement('img')
        image.src = localImagePath(imageUrl)
        image.alt = ''
        image.loading = 'lazy'
        card.append(image)
      }
      const details = document.createElement('span')
      details.className = 'assistant-result-details'
      const title = document.createElement('strong')
      title.textContent = result.title
      const meta = document.createElement('small')
      meta.textContent = `${result.collection} · ${result.creator}${result.category ? ` · ${result.category}` : ''}`
      details.append(title, meta)
      if (typeof result.price === 'number') {
        const price = document.createElement('small')
        price.textContent = `${result.currency ?? 'USD'} ${result.price.toLocaleString()}${result.availability ? ` · ${result.availability}` : ''}`
        details.append(price)
      }
      card.append(details)
      cards.append(card)
    }
    article.append(cards)
  }

  if (message.role === 'assistant' && message.id) {
    const feedback = document.createElement('div')
    feedback.className = 'assistant-feedback'
    feedback.setAttribute('aria-label', 'Rate this answer')
    for (let rating = 1; rating <= 5; rating += 1) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = '★'
      button.setAttribute('aria-label', `${rating} out of 5`)
      button.addEventListener('click', async () => {
        feedback.querySelectorAll('button').forEach((item) => { (item as HTMLButtonElement).disabled = true })
        try {
          await sendAssistantFeedback(message.id!, rating)
          feedback.textContent = 'Thanks for your feedback.'
        } catch (error) {
          feedback.textContent = error instanceof Error ? error.message : 'Feedback could not be submitted.'
        }
      })
      feedback.append(button)
    }
    article.append(feedback)
  }
  return article
}

function renderAssistantMessages() {
  const container = document.querySelector<HTMLDivElement>('#assistantMessages')!
  container.replaceChildren(...assistantMessages.map((message) => assistantMessageElement(message, message.results)))
  container.scrollTop = container.scrollHeight
}

function renderAssistantSuggestions() {
  const container = document.querySelector<HTMLDivElement>('#assistantSuggestions')!
  container.replaceChildren()
  for (const suggestion of assistantSuggestions.slice(0, 5)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = suggestion
    button.addEventListener('click', () => {
      const input = document.querySelector<HTMLTextAreaElement>('#assistantInput')!
      input.value = suggestion
      document.querySelector<HTMLFormElement>('#assistantForm')!.requestSubmit()
    })
    container.append(button)
  }
}

async function loadAssistantSessionList() {
  const list = document.querySelector<HTMLDivElement>('#assistantSessions')!
  if (!supabase || !currentFirebaseUser()?.emailVerified) {
    list.textContent = 'Sign in to save conversation history.'
    return
  }
  const { sessions } = await loadAssistantSessions()
  list.replaceChildren()
  if (!sessions.length) {
    list.textContent = 'Your saved conversations will appear here.'
    return
  }
  for (const item of sessions) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = item.title
    button.addEventListener('click', async () => {
      assistantSessionId = item.id
      document.querySelector<HTMLElement>('#assistantStatus')!.textContent = 'Loading conversation…'
      try {
        const { messages } = await loadAssistantHistory(item.id)
        assistantMessages = messages
        renderAssistantMessages()
        document.querySelector<HTMLElement>('#assistantStatus')!.textContent = 'Grounded in ArtHive records'
      } catch (error) {
        document.querySelector<HTMLElement>('#assistantStatus')!.textContent = error instanceof Error ? error.message : 'Conversation could not be loaded.'
      }
    })
    list.append(button)
  }
}

async function initializeAssistant() {
  const status = document.querySelector<HTMLElement>('#assistantStatus')!
  const messages = document.querySelector<HTMLDivElement>('#assistantMessages')!
  if (!assistantInitialized) {
    assistantInitialized = true
    assistantMessages = [{
      role: 'assistant',
      content: 'Welcome to ArtHive. I can help you discover published artworks, literature, essays, sculptures, creators, and available marketplace listings.',
    }]
    renderAssistantMessages()
  }
  if (!assistantConfigLoaded) {
    assistantConfigLoaded = true
    try {
      const config = await loadAssistantConfig()
      if (config.welcomeMessage && assistantMessages.length === 1) assistantMessages[0].content = config.welcomeMessage
      assistantSuggestions = config.suggestedQuestions
      renderAssistantMessages()
      renderAssistantSuggestions()
      const contact = document.querySelector<HTMLDivElement>('#assistantContact')!
      contact.replaceChildren()
      for (const item of config.contact) {
        const row = document.createElement('p')
        row.textContent = `${item.label}: `
        const link = document.createElement('a')
        link.textContent = item.value
        if (item.channel === 'email') link.href = `mailto:${item.value}`
        else if (item.channel === 'phone') link.href = `tel:${item.value}`
        else if (item.channel === 'website' || item.channel === 'social') {
          try {
            const url = new URL(item.value)
            if (url.protocol === 'https:') {
              link.href = url.href
              link.target = '_blank'
              link.rel = 'noopener noreferrer'
            }
          } catch {
            link.removeAttribute('href')
          }
        }
        row.append(link)
        contact.append(row)
      }
      if (config.isAdmin) {
        const panel = document.querySelector<HTMLDetailsElement>('#assistantAdminPanel')!
        panel.hidden = false
        const form = document.querySelector<HTMLFormElement>('#assistantAdminForm')!
        ;(form.elements.namedItem('enabled') as HTMLInputElement).checked = config.enabled
        ;(form.elements.namedItem('welcome') as HTMLTextAreaElement).value = config.welcomeMessage
        ;(form.elements.namedItem('suggestions') as HTMLTextAreaElement).value = config.suggestedQuestions.join('\n')
        ;(form.elements.namedItem('model') as HTMLInputElement).value = config.model ?? 'gpt-4o-mini'
        ;(form.elements.namedItem('limit') as HTMLInputElement).value = String(config.maxRequestsPerHour ?? 30)
      }
      status.textContent = config.enabled ? 'Grounded in ArtHive records' : 'Assistant is not configured yet'
      if (!config.enabled) {
        const note = document.createElement('p')
        note.className = 'assistant-setup-note'
        note.textContent = config.configured
          ? 'ArtHive AI is currently disabled. Please check back later.'
          : 'ArtHive AI needs to be configured by an administrator before it can answer questions.'
        messages.append(note)
      }
    } catch (error) {
      assistantConfigLoaded = false
      status.textContent = error instanceof Error ? error.message : 'Assistant configuration could not be loaded.'
    }
  }
  try {
    await loadAssistantSessionList()
  } catch (error) {
    document.querySelector<HTMLDivElement>('#assistantSessions')!.textContent = error instanceof Error ? error.message : 'Conversation history could not be loaded.'
  }
}

document.querySelector<HTMLFormElement>('#assistantForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const input = form.querySelector<HTMLTextAreaElement>('textarea')!
  const message = input.value.trim()
  const status = document.querySelector<HTMLElement>('#assistantStatus')!
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
  if (!message) return
  assistantSuggestions = []
  renderAssistantSuggestions()
  assistantMessages.push({ role: 'user', content: message })
  renderAssistantMessages()
  input.value = ''
  input.disabled = true
  submit.disabled = true
  status.textContent = 'ArtHive AI is thinking…'
  const pending = document.createElement('p')
  pending.className = 'assistant-pending'
  pending.textContent = 'Searching ArtHive records…'
  document.querySelector('#assistantMessages')!.append(pending)
  try {
    const response = await sendAssistantMessage(message, assistantSessionId, assistantMessages.slice(0, -1))
    assistantSessionId = response.sessionId ?? assistantSessionId
    assistantMessages.push({
      role: 'assistant',
      content: response.answer,
      id: response.messageId ?? undefined,
      results: response.results,
    })
    status.textContent = 'Grounded in ArtHive records'
    try {
      await loadAssistantSessionList()
    } catch {
      document.querySelector<HTMLDivElement>('#assistantSessions')!.textContent = 'Conversation history could not be refreshed.'
    }
  } catch (error) {
    assistantMessages.push({
      role: 'assistant',
      content: error instanceof Error ? error.message : 'ArtHive AI could not answer right now. Please try again.',
    })
    status.textContent = 'Unable to complete that request'
  } finally {
    input.disabled = false
    submit.disabled = false
    pending.remove()
    renderAssistantMessages()
    input.focus()
  }
})

document.querySelector('#assistantNewChat')?.addEventListener('click', () => {
  assistantSessionId = crypto.randomUUID()
  assistantMessages = [{
    role: 'assistant',
    content: 'Welcome to ArtHive. What would you like to discover?',
  }]
  renderAssistantMessages()
  renderAssistantSuggestions()
  document.querySelector<HTMLTextAreaElement>('#assistantInput')?.focus()
})

document.querySelector('#assistantSupportOpen')?.addEventListener('click', async () => {
  if (!supabase) {
    authDialog.showModal()
    return
  }
  if (!currentFirebaseUser()?.emailVerified) {
    authDialog.showModal()
    return
  }
  const form = document.querySelector<HTMLFormElement>('#assistantSupportForm')!
  form.hidden = !form.hidden
})

document.querySelector<HTMLFormElement>('#assistantSupportForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const data = new FormData(form)
  const status = form.querySelector<HTMLParagraphElement>('#assistantSupportStatus')!
  status.textContent = 'Sending…'
  try {
    const result = await submitSupportRequest(String(data.get('subject') ?? ''), String(data.get('message') ?? ''))
    status.textContent = `Support request #${result.requestId} submitted.`
    form.reset()
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Support request could not be submitted.'
  }
})

document.querySelector<HTMLFormElement>('#assistantAdminForm')?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const data = new FormData(form)
  const status = form.querySelector<HTMLParagraphElement>('#assistantAdminStatus')!
  const welcome = String(data.get('welcome') ?? '').trim()
  const model = String(data.get('model') ?? '').trim()
  const questions = String(data.get('suggestions') ?? '').split(/\r?\n/).map((question) => question.trim()).filter(Boolean)
  const limit = Number(data.get('limit'))
  if (!welcome || welcome.length > 500 || !/^[a-zA-Z0-9._-]{1,80}$/.test(model) || limit < 1 || limit > 200 || questions.length > 10 || questions.some((question) => question.length > 120)) {
    status.textContent = 'Check the welcome message, model, hourly limit, and suggested questions (up to 10, 120 characters each).'
    return
  }
  status.textContent = 'Saving…'
  try {
    await saveAssistantSettings({
      enabled: data.has('enabled'),
      welcome_message: welcome,
      suggested_questions: questions,
      model,
      max_requests_per_hour: limit,
    })
    status.textContent = 'Assistant settings saved.'
    assistantSuggestions = questions
    renderAssistantSuggestions()
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Settings could not be saved.'
  }
})

document.querySelector('#collectionSearch')?.addEventListener('input', () => {
  const route = location.hash.replace('#collection/', '')
  const resolved = resolveCollectionRoute(route)
  if (resolved) renderCollectionItems(resolved.collection.slug, resolved.subcategory?.slug)
})
document.querySelector('#collectionCategory')?.addEventListener('change', () => {
  const route = location.hash.replace('#collection/', '')
  const resolved = resolveCollectionRoute(route)
  if (resolved) renderCollectionItems(resolved.collection.slug, resolved.subcategory?.slug)
})
document.querySelector('#collectionSort')?.addEventListener('change', () => {
  const route = location.hash.replace('#collection/', '')
  const resolved = resolveCollectionRoute(route)
  if (resolved) renderCollectionItems(resolved.collection.slug, resolved.subcategory?.slug)
})
document.querySelector('#resetCollectionFilters')?.addEventListener('click', () => {
  document.querySelector<HTMLInputElement>('#collectionSearch')!.value = ''
  document.querySelector<HTMLSelectElement>('#collectionCategory')!.value = ''
  document.querySelector<HTMLSelectElement>('#collectionSort')!.value = 'recommended'
  const route = location.hash.replace('#collection/', '')
  const resolved = resolveCollectionRoute(route)
  if (resolved) location.hash = `#collection/${resolved.collection.slug}`
})
document.querySelector<HTMLInputElement>('#exploreSearch')?.addEventListener('input', (event) => {
  renderExploreSearchResults((event.currentTarget as HTMLInputElement).value)
})
document.querySelector('#clearExploreSearch')?.addEventListener('click', () => {
  const search = document.querySelector<HTMLInputElement>('#exploreSearch')!
  search.value = ''
  renderExploreSearchResults('')
  search.focus()
})
window.addEventListener('hashchange', handleCollectionRoute)

loadDiscoveryData()
void fetchMetObjects('museum painting', 12).catch(() => {
  // Bundled Met Open Access records remain available when the live API is offline.
})
handleCollectionRoute()
