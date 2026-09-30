export interface ColorThemeDefinition {
    id: string;
    displayName: string;
    defaultColor: string;
    palette: string[];
}
export declare const COLOR_THEMES: Record<string, ColorThemeDefinition>;
export declare function getColorTheme(themeKey?: any): ColorThemeDefinition;
