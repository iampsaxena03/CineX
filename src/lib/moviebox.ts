import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'

const SELECTED_HOST = process.env.MOVIEBOX_API_HOST || "h5.aoneroom.com";
const HOST_URL = `https://${SELECTED_HOST}`;

const DEFAULT_HEADERS = {
    'X-Client-Info': '{"timezone":"Africa/Nairobi"}',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'User-Agent': 'okhttp/4.12.0',
    'Referer': HOST_URL,
    'Host': SELECTED_HOST,
    'Connection': 'keep-alive',
    'X-Forwarded-For': '1.1.1.1',
    'CF-Connecting-IP': '1.1.1.1',
    'X-Real-IP': '1.1.1.1'
};

const SubjectType = {
    ALL: 0,
    MOVIES: 1,
    TV_SERIES: 2,
    MUSIC: 6
};

// Global instance to maintain cookies across API routes
const jar = new CookieJar();
const axiosInstance = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 30000
}));

let cookiesInitialized = false;

async function ensureCookiesAreAssigned() {
    if (!cookiesInitialized) {
        try {
            await axiosInstance.get(`${HOST_URL}/wefeed-h5-bff/app/get-latest-app-pkgs?app_name=moviebox`, {
                headers: DEFAULT_HEADERS
            });
            cookiesInitialized = true;
        } catch (error) {
            console.error('[MovieBox] Failed to init cookies:', error);
            throw error;
        }
    }
}

function processApiResponse(response: any) {
    if (response.data && response.data.data) {
        return response.data.data;
    }
    return response.data || response;
}

export async function searchMovieBox(query: string, type: 'movie' | 'tv' = 'movie') {
    await ensureCookiesAreAssigned();
    
    const subjectType = type === 'movie' ? SubjectType.MOVIES : SubjectType.TV_SERIES;
    
    const payload = {
        keyword: query,
        page: 1,
        perPage: 24,
        subjectType
    };
    
    try {
        const response = await axiosInstance.post(`${HOST_URL}/wefeed-h5-bff/web/subject/search`, payload, {
            headers: DEFAULT_HEADERS
        });
        
        let content = processApiResponse(response);
        if (content.items) {
           return content.items.filter((item: any) => item.subjectType === subjectType);
        }
        return [];
    } catch (error) {
        console.error('[MovieBox] Search error:', error);
        return [];
    }
}

export async function getMovieBoxDetails(subjectId: string) {
    await ensureCookiesAreAssigned();
    
    try {
        const response = await axiosInstance.get(`${HOST_URL}/wefeed-h5-bff/web/subject/detail`, {
            params: { subjectId },
            headers: DEFAULT_HEADERS
        });
        return processApiResponse(response).subject;
    } catch (error) {
        console.error(`[MovieBox] Details error for ${subjectId}:`, error);
        return null;
    }
}

export async function getMovieBoxDownloadSources(subjectId: string, detailPath: string, season = 0, episode = 0) {
    await ensureCookiesAreAssigned();
    
    const refererUrl = `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail`;
    
    const params = {
        subjectId,
        se: season,
        ep: episode
    };
    
    try {
        const response = await axiosInstance.get(`${HOST_URL}/wefeed-h5-bff/web/subject/download`, {
            params,
            headers: {
                ...DEFAULT_HEADERS,
                'Referer': refererUrl,
                'Origin': 'https://fmoviesunblocked.net'
            }
        });
        
        const content = processApiResponse(response);
        
        if (content && content.downloads) {
           return content.downloads.map((file: any) => ({
               id: file.id,
               quality: file.resolution ? file.resolution.toString() : 'Unknown',
               directUrl: file.url,
               size: file.size,
               format: 'mp4'
           }))
        }
        
        return [];
    } catch (error) {
        console.error(`[MovieBox] Sources error for ${subjectId}:`, error);
        return [];
    }
}
