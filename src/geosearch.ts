import { request, App } from 'obsidian';
import * as geosearch from 'leaflet-geosearch';
import * as leaflet from 'leaflet';
import * as querystring from 'query-string';

import { PluginSettings } from 'src/settings';
import { UrlConvertor } from 'src/urlConvertor';
import { FileMarker } from 'src/markers';
import * as consts from 'src/consts';
import { cnmapProvider } from './cnmapProvider';
import { Md5 } from 'ts-md5';
/**
 * A generic result of a geosearch
 */
export class GeoSearchResult {
    // The name to display
    name: string;
    location: leaflet.LatLng;
    resultType: 'searchResult' | 'url' | 'existingMarker';
    existingMarker?: FileMarker;
}

export class GeoSearcher {
    private searchProvider:
        | geosearch.OpenStreetMapProvider
        | cnmapProvider
        | geosearch.GoogleProvider = null;
    private settings: PluginSettings;
    private urlConvertor: UrlConvertor;

    constructor(app: App, settings: PluginSettings) {
        this.settings = settings;
        this.urlConvertor = new UrlConvertor(app, settings);
        if (settings.searchProvider == 'osm')
            this.searchProvider = new geosearch.OpenStreetMapProvider();
        else if (settings.searchProvider == 'google') {
            this.searchProvider = new geosearch.GoogleProvider({
                apiKey: settings.geocodingApiKey,
            });
        } else if (settings.searchProvider == 'cnmap') {
            this.searchProvider = new cnmapProvider();
        }
    }

    async search(
        query: string,
        searchArea: leaflet.LatLngBounds | null = null
    ): Promise<GeoSearchResult[]> {
        let results: GeoSearchResult[] = [];

        // Parsed URL result
        const parsedResultOrPromise =
            this.urlConvertor.parseLocationFromUrl(query);
        if (parsedResultOrPromise) {
            const parsedResult =
                parsedResultOrPromise instanceof Promise
                    ? await parsedResultOrPromise
                    : parsedResultOrPromise;
            results.push({
                name: `Parsed from ${parsedResult.ruleName}: ${parsedResult.location.lat}, ${parsedResult.location.lng}`,
                location: parsedResult.location,
                resultType: 'url',
            });
        }

        // Google Place results
        if (
            this.settings.searchProvider == 'google' &&
            this.settings.useGooglePlaces &&
            this.settings.geocodingApiKey
        ) {
            try {
                const placesResults = await googlePlacesSearch(
                    query,
                    this.settings,
                    searchArea?.getCenter()
                );
                for (const result of placesResults)
                    results.push({
                        name: result.name,
                        location: result.location,
                        resultType: 'searchResult',
                    });
            } catch (e) {
                console.log(
                    'Map View: Google Places search failed: ',
                    e.message
                );
            }
        } else if (
            this.settings.searchProvider == 'cnmap' &&
            this.settings.useCNPlaces &&
            this.settings.geocodingApiKey
        ) {
            if (
                this.settings.searchProvider != 'cnmap' ||
                !this.settings.useCNPlaces
            )
                return [];
            const [amapApiKey, baidumapApikey] =
                this.settings.geocodingApiKey.split(',');
            try {
                // 首先调用高德地图, 配额用完后调用百度地图
                console.log(query)
                const { poiResults: placesResults, err } =
                    await amapPlacesSearch(
                        query,
                        amapApiKey,
                        searchArea?.getCenter()
                    );
                if (err != '') {
                    // 调用百度地图
                    const { poiResults: placesResults, err } =
                        await baiduPlacesSearch(
                            query,
                            baidumapApikey,
                            searchArea?.getCenter()
                        );
                }
                for (const result of placesResults)
                    results.push({
                        name: result.name,
                        location: result.location,
                        resultType: 'searchResult',
                    });
            } catch (e) {
                console.log('Map View: 地图搜索失败: ', e.message);
            }
        } else {
            const areaSW = searchArea?.getSouthWest() || null;
            const areaNE = searchArea?.getNorthEast() || null;
            let searchResults = await this.searchProvider.search({
                query: query,
            });
            searchResults = searchResults.slice(
                0,
                consts.MAX_EXTERNAL_SEARCH_SUGGESTIONS
            );
            results = results.concat(
                searchResults.map(
                    (result) =>
                        ({
                            name: result.label,
                            location: new leaflet.LatLng(result.y, result.x),
                            resultType: 'searchResult',
                        } as GeoSearchResult)
                )
            );
        }

        return results;
    }
}

export async function googlePlacesSearch(
    query: string,
    settings: PluginSettings,
    centerOfSearch: leaflet.LatLng | null
): Promise<GeoSearchResult[]> {
    if (settings.searchProvider != 'google' || !settings.useGooglePlaces)
        return [];
    const googleApiKey = settings.geocodingApiKey;
    const params = {
        query: query,
        key: googleApiKey,
    };
    if (centerOfSearch)
        (params as any)[
            'location'
        ] = `${centerOfSearch.lat},${centerOfSearch.lng}`;
    const googleUrl =
        'https://maps.googleapis.com/maps/api/place/textsearch/json?' +
        querystring.stringify(params);
    const googleContent = await request({ url: googleUrl });
    const jsonContent = JSON.parse(googleContent) as any;
    let results: GeoSearchResult[] = [];
    if (
        jsonContent &&
        'results' in jsonContent &&
        jsonContent?.results.length > 0
    ) {
        for (const result of jsonContent.results) {
            const location = result.geometry?.location;
            if (location && location.lat && location.lng) {
                const geolocation = new leaflet.LatLng(
                    location.lat,
                    location.lng
                );
                results.push({
                    name: `${result?.name} (${result?.formatted_address})`,
                    location: geolocation,
                    resultType: 'searchResult',
                } as GeoSearchResult);
            }
        }
    }
    return results;
}

export async function amapPlacesSearch(
    query: string,
    apiKey: string,
    centerOfSearch: leaflet.LatLng | null
): Promise<{ poiResults: GeoSearchResult[]; err: string }> {
    const amapParams = {
        keywords: query,
        key: apiKey,
    };
    const amapUrl =
        'https://restapi.amap.com/v5/place/text?' +
        querystring.stringify(amapParams);
    const amapContent = await request({ url: amapUrl });
    const jsonContent = JSON.parse(amapContent) as any;
    let results: GeoSearchResult[] = [];
    if (jsonContent && jsonContent.info == 'OK' && jsonContent.status == '1') {
        for (const result of jsonContent.pois) {
            const location = result.location.split(',');
            if (location && location.length > 1) {
                const geolocation = new leaflet.LatLng(
                    location[1],
                    location[0]
                );
                results.push({
                    name: result.name,
                    location: geolocation,
                    resultType: 'searchResult',
                } as GeoSearchResult);
            }
        }
    } else if (jsonContent && jsonContent.info != 'OK') {
        return { poiResults: [], err: jsonContent.info };
    }

    return { poiResults: results, err: '' };
}

export async function baiduPlacesSearch(
    query: string,
    apiKey: string,
    centerOfSearch: leaflet.LatLng | null
): Promise<{ poiResults: GeoSearchResult[]; err: string }> {
    const baiduParams = {
        query: query,
        ak: apiKey,
        region: '全国',
        output: 'json',
        extensions_adcode: false,
        ret_coordtype: 'gcj02ll',
        coord_type: 2,
        photo_show: false,
    };
    // 服务地址
    const host = 'https://api.map.baidu.com';

    // 接口地址
    let uri = '/place/v2/search?';

    const queryStr = uri + querystring.stringify(baiduParams);
    let encodedStr = encodeURI(queryStr);
    const rawStr = encodedStr + 'WPGRp36kwrFfwiogwVBvpCuDMzLKPqnK';

    const sn = Md5.hashStr(rawStr);

    encodedStr = encodedStr + '&sn=' + sn + '&timestamp=' + Date.now();

    const amapContent = await request({ url: host + encodedStr });
    const jsonContent = JSON.parse(amapContent) as any;
    let results: GeoSearchResult[] = [];
    if (jsonContent && jsonContent.message == 'ok' && jsonContent.status == 0) {
        for (const result of jsonContent.results) {
            if (result.location) {
                const geolocation = new leaflet.LatLng(
                    result.location.lat,
                    result.location.lng
                );
                results.push({
                    name: result.name,
                    location: geolocation,
                    resultType: 'searchResult',
                } as GeoSearchResult);
            }
        }
    } else if (jsonContent && jsonContent.message != 'ok') {
        return { poiResults: [], err: jsonContent.message };
    }

    return { poiResults: results, err: '' };
}
