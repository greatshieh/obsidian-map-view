import { LatLng } from 'leaflet';
import { type SplitDirection, Notice } from 'obsidian';
import { type MapState, type LegacyMapState, mergeStates } from 'src/mapState';
import MapViewPlugin from 'src/main';
import * as consts from 'src/consts';

export type GeoHelperType = 'url' | 'commandline';
export type LegacyOpenBehavior = 'samePane' | 'secondPane' | 'alwaysNew';
export type OpenBehavior =
    | 'replaceCurrent'
    | 'dedicatedPane'
    | 'alwaysNewPane'
    | 'dedicatedTab'
    | 'alwaysNewTab'
    | 'lastUsed';
export type LinkNamePopupBehavior = 'never' | 'always' | 'mobileOnly';

export type PluginSettings = {
    defaultState: MapState;
    // Since the plugin evolves with time, we assume saved states to be partial, i.e. they may not include
    // all the fields of a full map state.
    savedStates: Partial<MapState[]>;
    markerIconRules: MarkerIconRule[];
    zoomOnGoFromNote: number;
    mapSources: TileSource[];
    frontMatterKey: string;
    chosenMapMode?: MapLightDark;
    autoZoom: boolean;
    letZoomBeyondMax: boolean;
    markerClickBehavior: OpenBehavior;
    markerCtrlClickBehavior: OpenBehavior;
    markerMiddleClickBehavior: OpenBehavior;
    openMapBehavior: OpenBehavior;
    openMapCtrlClickBehavior: OpenBehavior;
    openMapMiddleClickBehavior: OpenBehavior;
    newPaneSplitDirection: SplitDirection;
    newNoteNameFormat: string;
    newNotePath: string;
    newNoteTemplate: string;
    showNoteNamePopup: boolean;
    showLinkNameInPopup: LinkNamePopupBehavior;
    showNativeObsidianHoverPopup: boolean;
    showNotePreview: boolean;
    showClusterPreview: boolean;
    debug: boolean;
    openIn: OpenInSettings[];
    urlParsingRules: UrlParsingRule[];
    mapControls: MapControls;
    maxClusterRadiusPixels: number;
    searchProvider: 'osm' | 'google' | 'cn';
    searchDelayMs: number;
    geocodingApiKey: string;
    amapApiKey: string;
    baiduAPikey: string;
    useGooglePlaces: boolean;
    saveHistory: boolean;
    queryForFollowActiveNote: string;
    supportRealTimeGeolocation: boolean;
    fixFrontMatterOnPaste: boolean;
    geoHelperPreferApp: boolean;
    geoHelperType: GeoHelperType;
    geoHelperCommand: string;
    geoHelperUrl: string;
    tagForGeolocationNotes: string;
    handleGeolinksInNotes: boolean;
    showGeolinkPreview: boolean;
    zoomOnGeolinkPreview: number;
    handleGeolinkContextMenu: boolean;
    routingUrl: string;
    cacheAllTiles: boolean;
    offlineMaxTileAgeMonths: number;
    offlineMaxStorageGb: number;
};

export type DepracatedFields = {
    markerIcons?: Record<string, any>;
    tilesUrl?: string;
    chosenMapSource?: number;
    defaultMapCenter?: LatLng;
    defaultZoom?: number;
    defaultTags?: string[];
    snippetLines?: number;
};

export type MapLightDark = 'auto' | 'light' | 'dark';

export type TileSource = {
    name: string;
    urlLight: string;
    urlDark?: string;
    currentMode?: MapLightDark;
    preset?: boolean;
    ignoreErrors?: boolean;
    maxZoom?: number;
};

export type OpenInSettings = {
    name: string;
    urlPattern: string;
};

export type UrlParsingRuleType = 'latLng' | 'lngLat' | 'fetch';
export type UrlParsingContentType = 'latLng' | 'lngLat' | 'googlePlace';

export type UrlParsingRule = {
    name: string;
    regExp: string;
    ruleType: UrlParsingRuleType;
    contentParsingRegExp?: string;
    contentType?: UrlParsingContentType;
    preset: boolean;
};

export type LegacyUrlParsingRule = UrlParsingRule & {
    order: 'latFirst' | 'lngFirst';
};

export type MapControls = {
    minimized: boolean;
    filtersDisplayed: boolean;
    viewDisplayed: boolean;
    linksDisplayed: boolean;
    presetsDisplayed: boolean;
};

export type MarkerIconRule = {
    ruleName: string;
    preset: boolean;
    iconDetails: any;
};

export const DEFAULT_SETTINGS: PluginSettings = {
    defaultState: {
        name: 'Default',
        mapZoom: 1.0,
        mapCenter: new LatLng(40.44694705960048, -180.70312500000003),
        query: '',
        queryError: false,
        chosenMapSource: 0,
        forceHistorySave: false,
        followActiveNote: false,
        embeddedHeight: 300,
        autoFit: false,
        lock: false,
        showLinks: false,
        linkColor: 'red',
        markerLabels: 'off',
    },
    savedStates: [],
    markerIconRules: [
        {
            ruleName: 'default',
            preset: true,
            iconDetails: {
                prefix: 'fas',
                icon: 'fa-circle',
                markerColor: 'blue',
            },
        },
        {
            ruleName: '#trip',
            preset: false,
            iconDetails: {
                prefix: 'fas',
                icon: 'fa-hiking',
                markerColor: 'green',
            },
        },
        {
            ruleName: '#trip-water',
            preset: false,
            iconDetails: { prefix: 'fas', markerColor: 'blue' },
        },
        {
            ruleName: '#dogs',
            preset: false,
            iconDetails: { prefix: 'fas', icon: 'fa-paw' },
        },
    ],
    zoomOnGoFromNote: 15,
    autoZoom: true,
    markerClickBehavior: 'replaceCurrent',
    markerCtrlClickBehavior: 'dedicatedPane',
    markerMiddleClickBehavior: 'dedicatedTab',
    openMapBehavior: 'replaceCurrent',
    openMapCtrlClickBehavior: 'dedicatedPane',
    openMapMiddleClickBehavior: 'dedicatedTab',
    newPaneSplitDirection: 'vertical',
    newNoteNameFormat: 'Location added on {{date:YYYY-MM-DD}}T{{date:HH-mm}}',
    newNotePath: '',
    newNoteTemplate: '',
    showNoteNamePopup: true,
    showLinkNameInPopup: 'always',
    showNativeObsidianHoverPopup: false,
    showNotePreview: true,
    showClusterPreview: true,
    debug: false,
    openIn: [
        {
            name: 'Google Maps',
            urlPattern: 'https://maps.google.com/?q={x},{y}',
        },
    ],
    urlParsingRules: [
        {
            name: 'OpenStreetMap Show Address',
            regExp: /https:\/\/www.openstreetmap.org\S*query=([0-9\.\-]+%2C[0-9\.\-]+)\S*/
                .source,
            ruleType: 'latLng',
            preset: true,
        },
        {
            name: 'Generic Lat,Lng',
            regExp: /([0-9\.\-]+),\s*([0-9\.\-]+)/.source,
            ruleType: 'latLng',
            preset: true,
        },
        {
            name: 'Geolocation Link',
            regExp: /\[.*\]\(geo:([0-9\.\-]+),([0-9\.\-]+)\)/.source,
            ruleType: 'latLng',
            preset: true,
        },
    ],
    mapControls: {
        minimized: false,
        filtersDisplayed: true,
        viewDisplayed: true,
        linksDisplayed: false,
        presetsDisplayed: false,
    },
    maxClusterRadiusPixels: 20,
    searchProvider: 'osm',
    searchDelayMs: 250,
    geocodingApiKey: '',
    amapApiKey: '',
    baiduAPikey: '',
    useGooglePlaces: false,
    mapSources: [
        {
            name: 'CartoDB',
            urlLight:
                'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            preset: true,
        },
    ],
    frontMatterKey: 'location',
    chosenMapMode: 'auto',
    saveHistory: true,
    letZoomBeyondMax: false,
    queryForFollowActiveNote: 'path:"$PATH$"',
    supportRealTimeGeolocation: false,
    fixFrontMatterOnPaste: true,
    geoHelperPreferApp: false,
    geoHelperType: 'url',
    geoHelperCommand: 'chrome',
    geoHelperUrl: 'https://esm7.github.io/obsidian-geo-helper/',
    tagForGeolocationNotes: '',
    handleGeolinksInNotes: true,
    showGeolinkPreview: false,
    zoomOnGeolinkPreview: 10,
    handleGeolinkContextMenu: true,
    routingUrl:
        'https://www.google.com/maps/dir/?api=1&origin={x0},{y0}&destination={x1},{y1}',
    cacheAllTiles: true,
    // 0 means never automatically purge
    offlineMaxTileAgeMonths: 6,
    // 0 means never automatically purge
    offlineMaxStorageGb: 2,
};

export function convertLegacyMarkerIcons(settings: PluginSettings): boolean {
    if (settings.markerIcons) {
        settings.markerIconRules = [];
        for (let key in settings.markerIcons) {
            const newRule: MarkerIconRule = {
                ruleName: key,
                preset: key === 'default',
                iconDetails: settings.markerIcons[key],
            };
            settings.markerIconRules.push(newRule);
        }
        settings.markerIcons = null;
        return true;
    }
    return false;
}

export function convertLegacyTilesUrl(settings: PluginSettings): boolean {
    if (settings.tilesUrl) {
        settings.mapSources = [
            {
                name: 'Default',
                urlLight: settings.tilesUrl,
                maxZoom: consts.DEFAULT_MAX_TILE_ZOOM,
            },
        ];
        settings.tilesUrl = null;
        return true;
    }
    return false;
}

export function convertLegacyDefaultState(settings: PluginSettings): boolean {
    if (
        settings.defaultTags ||
        settings.defaultZoom ||
        settings.defaultMapCenter ||
        settings.chosenMapSource
    ) {
        settings.defaultState = mergeStates(DEFAULT_SETTINGS.defaultState, {
            name: 'Default',
            mapZoom:
                settings.defaultZoom || DEFAULT_SETTINGS.defaultState.mapZoom,
            mapCenter:
                settings.defaultMapCenter ||
                DEFAULT_SETTINGS.defaultState.mapCenter,
            query:
                settings.defaultTags.join(' OR ') ||
                DEFAULT_SETTINGS.defaultState.query,
            chosenMapSource:
                settings.chosenMapSource ??
                DEFAULT_SETTINGS.defaultState.chosenMapSource,
        });
        settings.defaultTags =
            settings.defaultZoom =
            settings.defaultMapCenter =
            settings.chosenMapSource =
                null;
        return true;
    }
    return false;
}

export function removeLegacyPresets1(settings: PluginSettings): boolean {
    const googleMapsParsingRule = settings.urlParsingRules.findIndex(
        (rule) => rule.name == 'Google Maps' && rule.preset,
    );
    if (googleMapsParsingRule > -1) {
        settings.urlParsingRules.splice(googleMapsParsingRule, 1);
        return true;
    }
    if (
        settings.mapSources.findIndex(
            (item) => item.name == DEFAULT_SETTINGS.mapSources[0].name,
        ) === -1
    ) {
        settings.mapSources.unshift(DEFAULT_SETTINGS.mapSources[0]);
        return true;
    }
    return false;
}

export function convertTagsToQueries(settings: PluginSettings): boolean {
    let changed = false;
    let defaultState = settings.defaultState as LegacyMapState;
    if (defaultState.tags && defaultState.tags.length > 0) {
        defaultState.query = defaultState.tags.join(' OR ');
        delete defaultState.tags;
        changed = true;
    }
    for (let preset of settings.savedStates) {
        let legacyPreset = preset as LegacyMapState;
        if (legacyPreset.tags && legacyPreset.tags.length > 0) {
            legacyPreset.query = legacyPreset.tags.join(' OR ');
            delete legacyPreset.tags;
            changed = true;
        }
    }
    return changed;
}

export function convertUrlParsingRules1(settings: PluginSettings): boolean {
    let changed = false;
    for (let rule of settings.urlParsingRules) {
        const legacyRule = rule as LegacyUrlParsingRule;
        if (legacyRule.order) {
            rule.ruleType =
                legacyRule.order === 'latFirst' ? 'latLng' : 'lngLat';
            delete legacyRule.order;
            changed = true;
        }
    }
    return changed;
}

export function convertLegacyOpenBehavior(settings: PluginSettings): boolean {
    let changed = false;
    const legacyMarkerClick = settings.markerClickBehavior as any;
    if (legacyMarkerClick === 'samePane') {
        settings.markerClickBehavior = 'replaceCurrent';
        settings.markerCtrlClickBehavior = 'dedicatedPane';
        changed = true;
    } else if (legacyMarkerClick === 'secondPane') {
        settings.markerClickBehavior = 'dedicatedPane';
        settings.markerCtrlClickBehavior = 'replaceCurrent';
        changed = true;
    } else if (legacyMarkerClick === 'alwaysNew') {
        settings.markerClickBehavior = 'alwaysNewPane';
        settings.markerCtrlClickBehavior = 'replaceCurrent';
        changed = true;
    }
    return changed;
}

/*
 * The more Map View evolves, fields get added to the MapState class, leading to old saved states having
 * missing fields.
 * This completes missing fields from the default settings.
 */
function completePartialSavedStates(settings: PluginSettings) {
    const newStates: MapState[] = [];
    for (const savedState of settings.savedStates) {
        const state = mergeStates(DEFAULT_SETTINGS.defaultState, savedState);
        newStates.push(state);
    }
    settings.savedStates = newStates;
}

export async function convertLegacySettings(
    settings: PluginSettings,
    plugin: MapViewPlugin,
) {
    let changed = false;
    // Convert old settings formats that are no longer supported
    if (convertLegacyMarkerIcons(settings)) {
        changed = true;
        new Notice(
            'Map View: legacy marker icons were converted to the new format',
        );
    }
    if (convertLegacyTilesUrl(settings)) {
        changed = true;
        new Notice(
            'Map View: legacy tiles URL was converted to the new format',
        );
    }
    if (convertLegacyDefaultState(settings)) {
        changed = true;
        new Notice(
            'Map View: legacy default state was converted to the new format',
        );
    }
    if (removeLegacyPresets1(settings)) {
        changed = true;
        new Notice(
            'Map View: legacy URL parsing rules and/or map sources were converted. See the release notes',
        );
    }
    if (convertTagsToQueries(settings)) {
        changed = true;
        new Notice(
            'Map View: legacy tag queries were converted to the new query format',
        );
    }
    if (convertUrlParsingRules1(settings)) {
        changed = true;
        new Notice(
            'Map View: URL parsing rules were converted to the new format',
        );
    }
    if (convertLegacyOpenBehavior(settings)) {
        changed = true;
        new Notice(
            'Map View: marker click settings were converted to the new settings format (check the settings for new options!)',
        );
    }

    completePartialSavedStates(settings);

    if (changed) plugin.saveSettings();
}
