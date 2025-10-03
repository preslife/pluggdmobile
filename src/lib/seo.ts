const DEFAULT_DESCRIPTION = 'Pluggd helps creators sell releases, beats, memberships, and more while fans discover the next wave of sound.';
const DEFAULT_OG_IMAGE = (import.meta as any).env?.VITE_OG_DEFAULT_IMAGE || '/placeholder.svg';

const ensureMeta = (selector: string, attr: 'name' | 'property', value: string) => {
  let meta = document.querySelector(selector) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, value);
    document.head.appendChild(meta);
  }
  return meta;
};

const ensureCanonical = (href: string) => {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

export const getCanonicalUrl = (path?: string) => {
  const base = path && path.startsWith('http') ? path : `${window.location.origin}${path || window.location.pathname}`;
  try {
    return new URL(base).toString();
  } catch {
    return `${window.location.origin}${window.location.pathname}`;
  }
};

export const setMeta = (title: string, description = DEFAULT_DESCRIPTION, path?: string, image = DEFAULT_OG_IMAGE) => {
  if (title) document.title = title;

  const metaDescription = ensureMeta('meta[name="description"]', 'name', 'description');
  metaDescription.setAttribute('content', description || DEFAULT_DESCRIPTION);

  const canonicalHref = getCanonicalUrl(path);
  ensureCanonical(canonicalHref);

  setOGMeta(title, description, image, 'website', canonicalHref);
};

export const setOGMeta = (
  title: string,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  canonicalUrl: string = getCanonicalUrl()
) => {
  const metaTags = [
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: canonicalUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description }
  ];

  if (image) {
    metaTags.push(
      { property: 'og:image', content: image },
      { name: 'twitter:image', content: image }
    );
  }

  metaTags.forEach(({ property, name, content }) => {
    if (property) {
      const meta = ensureMeta(`meta[property="${property}"]`, 'property', property);
      meta.setAttribute('content', content);
    } else if (name) {
      const meta = ensureMeta(`meta[name="${name}"]`, 'name', name);
      meta.setAttribute('content', content);
    }
  });
};
