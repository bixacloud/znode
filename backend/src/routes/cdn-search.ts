import { Router, Response, Request } from 'express';
import axios from 'axios';

const router = Router();

// Popular libraries list
const POPULAR_LIBRARIES = [
  { name: 'jquery', description: 'jQuery is a fast, small, and feature-rich JavaScript library' },
  { name: 'bootstrap', description: 'The most popular HTML, CSS, and JS library in the world' },
  { name: 'react', description: 'A JavaScript library for building user interfaces' },
  { name: 'vue', description: 'The Progressive JavaScript Framework' },
  { name: 'axios', description: 'Promise based HTTP client for the browser and node.js' },
  { name: 'lodash', description: 'A modern JavaScript utility library delivering modularity, performance & extras' },
  { name: 'moment', description: 'Parse, validate, manipulate, and display dates in JavaScript' },
  { name: 'sweetalert2', description: 'A beautiful, responsive, customizable and accessible replacement for JavaScript\'s popup boxes' },
  { name: 'chart.js', description: 'Simple yet flexible JavaScript charting for designers & developers' },
  { name: 'animate.css', description: 'A cross-browser library of CSS animations' },
  { name: 'font-awesome', description: 'The iconic SVG, font, and CSS toolkit' },
  { name: 'tailwindcss', description: 'A utility-first CSS framework for rapidly building custom user interfaces' },
];

// CDN Provider configs
const CDN_PROVIDERS = {
  cdnjs: {
    name: 'cdnjs',
    searchUrl: 'https://api.cdnjs.com/libraries',
    libraryUrl: 'https://api.cdnjs.com/libraries/',
    baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/',
    logo: 'https://cdnjs.cloudflare.com/favicon.ico',
  },
  jsdelivr: {
    name: 'jsDelivr',
    searchUrl: 'https://data.jsdelivr.com/v1/packages/npm/',
    npmUrl: 'https://data.jsdelivr.com/v1/packages/npm/',
    baseUrl: 'https://cdn.jsdelivr.net/npm/',
    logo: 'https://www.jsdelivr.com/favicon.ico',
  },
  unpkg: {
    name: 'unpkg',
    baseUrl: 'https://unpkg.com/',
    logo: 'https://unpkg.com/favicon.ico',
  },
};

// Search libraries via cdnjs API
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

    // Search from cdnjs
    const cdnjsResponse = await axios.get(`${CDN_PROVIDERS.cdnjs.searchUrl}`, {
      params: {
        search: query,
        fields: 'name,description,version,homepage,repository,license',
        limit: 20,
      },
      timeout: 5000,
    });

    const results = cdnjsResponse.data.results.map((lib: any) => ({
      name: lib.name,
      description: lib.description || '',
      version: lib.version || '',
      homepage: lib.homepage || '',
      repository: lib.repository?.url || '',
      license: lib.license || '',
      providers: ['cdnjs', 'jsdelivr', 'unpkg'],
    }));

    res.json({ results });
  } catch (error) {
    console.error('Error searching libraries:', error);
    res.status(500).json({ error: 'Failed to search libraries' });
  }
});

// Get popular libraries
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const popularWithVersions = await Promise.all(
      POPULAR_LIBRARIES.map(async (lib) => {
        try {
          const response = await axios.get(`${CDN_PROVIDERS.cdnjs.libraryUrl}${lib.name}`, {
            params: { fields: 'version' },
            timeout: 3000,
          });
          return {
            ...lib,
            version: response.data.version || 'latest',
            providers: ['cdnjs', 'jsdelivr', 'unpkg'],
          };
        } catch {
          return {
            ...lib,
            version: 'latest',
            providers: ['cdnjs', 'jsdelivr', 'unpkg'],
          };
        }
      })
    );

    res.json({ libraries: popularWithVersions });
  } catch (error) {
    console.error('Error fetching popular libraries:', error);
    res.json({ libraries: POPULAR_LIBRARIES.map(lib => ({ ...lib, version: 'latest', providers: ['cdnjs', 'jsdelivr', 'unpkg'] })) });
  }
});

// Get library details
router.get('/library/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const version = req.query.version as string;

    // Get library info from cdnjs
    const cdnjsResponse = await axios.get(`${CDN_PROVIDERS.cdnjs.libraryUrl}${name}`, {
      params: {
        fields: 'name,description,version,versions,homepage,repository,license,author,keywords,filename',
      },
      timeout: 10000,
    });

    const library = cdnjsResponse.data;
    const selectedVersion = version || library.version;

    // Get files for the selected version from version-specific endpoint
    let files: string[] = [];
    try {
      const versionResponse = await axios.get(
        `${CDN_PROVIDERS.cdnjs.libraryUrl}${name}/${selectedVersion}`,
        { timeout: 5000 }
      );
      files = versionResponse.data.files || [];
    } catch {
      // Fallback to empty if version endpoint fails
      files = [];
    }

    // Generate CDN URLs
    const cdnUrls = {
      cdnjs: {
        name: 'cdnjs',
        logo: CDN_PROVIDERS.cdnjs.logo,
        js: library.filename?.endsWith('.js') 
          ? `${CDN_PROVIDERS.cdnjs.baseUrl}${name}/${selectedVersion}/${library.filename}`
          : null,
        css: files.find((f: string) => f.endsWith('.min.css') || f.endsWith('.css'))
          ? `${CDN_PROVIDERS.cdnjs.baseUrl}${name}/${selectedVersion}/${files.find((f: string) => f.endsWith('.min.css')) || files.find((f: string) => f.endsWith('.css'))}`
          : null,
        allFiles: files.map((f: string) => `${CDN_PROVIDERS.cdnjs.baseUrl}${name}/${selectedVersion}/${f}`),
      },
      jsdelivr: {
        name: 'jsDelivr',
        logo: CDN_PROVIDERS.jsdelivr.logo,
        js: library.filename?.endsWith('.js')
          ? `${CDN_PROVIDERS.jsdelivr.baseUrl}${name}@${selectedVersion}/${library.filename}`
          : null,
        css: files.find((f: string) => f.endsWith('.min.css') || f.endsWith('.css'))
          ? `${CDN_PROVIDERS.jsdelivr.baseUrl}${name}@${selectedVersion}/${files.find((f: string) => f.endsWith('.min.css')) || files.find((f: string) => f.endsWith('.css'))}`
          : null,
        allFiles: files.map((f: string) => `${CDN_PROVIDERS.jsdelivr.baseUrl}${name}@${selectedVersion}/${f}`),
      },
      unpkg: {
        name: 'unpkg',
        logo: CDN_PROVIDERS.unpkg.logo,
        js: library.filename?.endsWith('.js')
          ? `${CDN_PROVIDERS.unpkg.baseUrl}${name}@${selectedVersion}/${library.filename}`
          : null,
        css: files.find((f: string) => f.endsWith('.min.css') || f.endsWith('.css'))
          ? `${CDN_PROVIDERS.unpkg.baseUrl}${name}@${selectedVersion}/${files.find((f: string) => f.endsWith('.min.css')) || files.find((f: string) => f.endsWith('.css'))}`
          : null,
        allFiles: files.map((f: string) => `${CDN_PROVIDERS.unpkg.baseUrl}${name}@${selectedVersion}/${f}`),
      },
    };

    // Get README if available
    let readme = '';
    try {
      if (library.repository?.url) {
        const repoUrl = library.repository.url.replace('git+', '').replace('.git', '');
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          const [, owner, repo] = match;
          const readmeResponse = await axios.get(
            `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
            { timeout: 5000 }
          );
          readme = readmeResponse.data;
        }
      }
    } catch {
      // README not available
    }

    res.json({
      name: library.name,
      description: library.description,
      version: selectedVersion,
      versions: library.versions || [],
      homepage: library.homepage,
      repository: library.repository?.url || '',
      license: library.license,
      author: library.author,
      keywords: library.keywords || [],
      filename: library.filename,
      files,
      cdnUrls,
      readme,
    });
  } catch (error: any) {
    console.error('Error fetching library details:', error);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Library not found' });
    }
    res.status(500).json({ error: 'Failed to fetch library details' });
  }
});

// CDN Speed Test
router.post('/speed-test', async (req: Request, res: Response) => {
  try {
    const { library = 'jquery', version = '3.7.1' } = req.body;

    // Test URLs for each CDN
    const testUrls = {
      cdnjs: `https://cdnjs.cloudflare.com/ajax/libs/${library}/${version}/${library}.min.js`,
      jsdelivr: `https://cdn.jsdelivr.net/npm/${library}@${version}/dist/${library}.min.js`,
      unpkg: `https://unpkg.com/${library}@${version}/dist/${library}.min.js`,
    };

    // Run speed tests in parallel
    const results = await Promise.all(
      Object.entries(testUrls).map(async ([provider, url]) => {
        const startTime = Date.now();
        try {
          await axios.head(url, { timeout: 10000 });
          const endTime = Date.now();
          return {
            provider,
            url,
            time: endTime - startTime,
            status: 'success',
          };
        } catch (error: any) {
          // Try alternate URL patterns
          let altUrl = url;
          if (provider === 'jsdelivr') {
            altUrl = `https://cdn.jsdelivr.net/npm/${library}@${version}/${library}.min.js`;
          } else if (provider === 'unpkg') {
            altUrl = `https://unpkg.com/${library}@${version}/${library}.min.js`;
          }

          if (altUrl !== url) {
            try {
              const altStart = Date.now();
              await axios.head(altUrl, { timeout: 10000 });
              const altEnd = Date.now();
              return {
                provider,
                url: altUrl,
                time: altEnd - altStart,
                status: 'success',
              };
            } catch {
              // Fall through to error
            }
          }

          return {
            provider,
            url,
            time: null,
            status: 'error',
            error: error.message,
          };
        }
      })
    );

    // Sort by speed (fastest first)
    const sortedResults = results.sort((a, b) => {
      if (a.status === 'error') return 1;
      if (b.status === 'error') return -1;
      return (a.time || Infinity) - (b.time || Infinity);
    });

    // Calculate statistics
    const successResults = sortedResults.filter(r => r.status === 'success');
    const stats = {
      fastest: successResults[0] || null,
      slowest: successResults[successResults.length - 1] || null,
      average: successResults.length > 0
        ? Math.round(successResults.reduce((sum, r) => sum + (r.time || 0), 0) / successResults.length)
        : null,
    };

    res.json({
      success: true,
      library,
      version,
      results: sortedResults,
      stats,
    });
  } catch (error) {
    console.error('Error running speed test:', error);
    res.status(500).json({ error: 'Failed to run speed test' });
  }
});

export default router;
