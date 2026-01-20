/**
 * Translation service for skill marketplace content
 * Uses Google Translate API with local caching
 */

const TRANSLATION_CACHE_KEY = 'skillTranslationCache';
const CACHE_EXPIRY_DAYS = 30;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

interface TranslationCacheEntry {
    text: string;
    translatedAt: number;
}

interface TranslationCache {
    [cacheKey: string]: TranslationCacheEntry;
}

interface GoogleTranslateResponse {
    data: {
        translations: Array<{
            translatedText: string;
        }>;
    };
}

/**
 * Generate a simple hash for cache key
 */
function hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Get the translation cache from localStorage
 */
function getCache(): TranslationCache {
    try {
        const cached = localStorage.getItem(TRANSLATION_CACHE_KEY);
        if (!cached) return {};

        const cache: TranslationCache = JSON.parse(cached);
        const now = Date.now();
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        // Clean expired entries
        const cleanedCache: TranslationCache = {};
        for (const [key, entry] of Object.entries(cache)) {
            if (now - entry.translatedAt < expiryMs) {
                cleanedCache[key] = entry;
            }
        }

        return cleanedCache;
    } catch (error) {
        console.warn('Failed to read translation cache:', error);
        return {};
    }
}

/**
 * Save the translation cache to localStorage
 */
function saveCache(cache: TranslationCache): void {
    try {
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save translation cache:', error);
    }
}

/**
 * Get cached translation if available
 */
function getCachedTranslation(text: string, targetLang: string): string | null {
    const cache = getCache();
    const cacheKey = `${targetLang}:${hashText(text)}`;
    const entry = cache[cacheKey];

    if (entry) {
        return entry.text;
    }
    return null;
}

/**
 * Save translation to cache
 */
function cacheTranslation(originalText: string, translatedText: string, targetLang: string): void {
    const cache = getCache();
    const cacheKey = `${targetLang}:${hashText(originalText)}`;

    cache[cacheKey] = {
        text: translatedText,
        translatedAt: Date.now(),
    };

    saveCache(cache);
}

/**
 * Translate a single text string
 * @param text - Text to translate
 * @param targetLang - Target language code (e.g., 'zh')
 * @param apiKey - Google Translate API key
 */
export async function translateText(
    text: string,
    targetLang: string,
    apiKey: string
): Promise<string> {
    if (!text || !text.trim()) {
        return text;
    }

    // Check cache first
    const cached = getCachedTranslation(text, targetLang);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                target: targetLang,
                format: 'text',
            }),
        });

        if (!response.ok) {
            throw new Error(`Translation API error: ${response.status}`);
        }

        const data: GoogleTranslateResponse = await response.json();
        const translatedText = data.data.translations[0]?.translatedText || text;

        // Cache the result
        cacheTranslation(text, translatedText, targetLang);

        return translatedText;
    } catch (error) {
        console.error('Translation failed:', error);
        return text; // Return original text on failure
    }
}

/**
 * Translate multiple texts in batch
 * @param texts - Array of texts to translate
 * @param targetLang - Target language code
 * @param apiKey - Google Translate API key
 */
export async function translateBatch(
    texts: string[],
    targetLang: string,
    apiKey: string
): Promise<string[]> {
    if (!texts.length) return [];

    const results: string[] = [];
    const uncachedTexts: { index: number; text: string }[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (!text || !text.trim()) {
            results[i] = text;
            continue;
        }

        const cached = getCachedTranslation(text, targetLang);
        if (cached) {
            results[i] = cached;
        } else {
            uncachedTexts.push({ index: i, text });
        }
    }

    // Translate uncached texts
    if (uncachedTexts.length > 0) {
        try {
            const textsToTranslate = uncachedTexts.map(item => item.text);

            const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: textsToTranslate,
                    target: targetLang,
                    format: 'text',
                }),
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const data: GoogleTranslateResponse = await response.json();
            const translations = data.data.translations;

            // Map results back and cache them
            for (let i = 0; i < uncachedTexts.length; i++) {
                const { index, text } = uncachedTexts[i];
                const translatedText = translations[i]?.translatedText || text;
                results[index] = translatedText;
                cacheTranslation(text, translatedText, targetLang);
            }
        } catch (error) {
            console.error('Batch translation failed:', error);
            // Fill in original texts for failed translations
            for (const { index, text } of uncachedTexts) {
                if (results[index] === undefined) {
                    results[index] = text;
                }
            }
        }
    }

    return results;
}

/**
 * Clear all translation cache
 */
export function clearTranslationCache(): void {
    try {
        localStorage.removeItem(TRANSLATION_CACHE_KEY);
    } catch (error) {
        console.warn('Failed to clear translation cache:', error);
    }
}

/**
 * Get cache statistics
 */
export function getTranslationCacheStats(): { entryCount: number; sizeBytes: number } {
    try {
        const cached = localStorage.getItem(TRANSLATION_CACHE_KEY);
        if (!cached) return { entryCount: 0, sizeBytes: 0 };

        const cache: TranslationCache = JSON.parse(cached);
        return {
            entryCount: Object.keys(cache).length,
            sizeBytes: new Blob([cached]).size,
        };
    } catch {
        return { entryCount: 0, sizeBytes: 0 };
    }
}
