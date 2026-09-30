/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { EnhancedTooltipInfo, HighContrastSettings } from "../types";
import { normalizeColor, extractFlagClass, extractSashClass, getRgbFromColor, getReadableTextColorForBg } from "../utils/colorUtils";
import { formatEventDate } from "../utils/dateUtils";
import { renderHtmlContent, sanitizeHtmlToText } from "../utils/domUtils";
import { getItemContent, formatContentForTooltip } from "../styling/markerStyling";

export interface TooltipManagerOptions {
    target: HTMLElement;
    tooltipService: ITooltipService | null;
    getItemsUnderPointer: (clientX: number, clientY: number) => any[];
    getItemById: (id: any) => any;
    getHighContrastSettings: () => HighContrastSettings;
    getShowFieldNames: () => boolean;
    getLocalizedString?: (key: string, fallback: string) => string;
}

export class TooltipManager {
    public enhancedTooltipElement: HTMLElement;
    public enhancedTooltipHeader: HTMLElement;
    public enhancedTooltipTitleText: HTMLElement;
    public enhancedTooltipBadges: HTMLElement;
    public enhancedTooltipBadgeMore: HTMLElement;
    public enhancedTooltipDate: HTMLElement;
    public enhancedTooltipContentContainer: HTMLElement;
    public enhancedTooltipContent: HTMLElement;
    public enhancedTooltipMoreHint: HTMLElement;

    public currentTooltipFontFamily: string = '';
    public currentTooltipFontSize: number = 0;

    private target: HTMLElement;
    private tooltipService: ITooltipService | null;
    private options: TooltipManagerOptions;

    constructor(options: TooltipManagerOptions) {
        this.options = options;
        this.target = options.target;
        this.tooltipService = options.tooltipService;

        // Enhanced Color Tooltip element inside visual container
        this.enhancedTooltipElement = document.createElement("div");
        this.enhancedTooltipElement.className = "enhanced-color-tooltip";
        this.enhancedTooltipElement.style.display = "none";
        this.enhancedTooltipElement.setAttribute("role", "tooltip");
        this.enhancedTooltipElement.setAttribute("aria-hidden", "true");

        this.enhancedTooltipHeader = document.createElement("div");
        this.enhancedTooltipHeader.className = "enhanced-tooltip-header";
        this.enhancedTooltipElement.appendChild(this.enhancedTooltipHeader);

        this.enhancedTooltipTitleText = document.createElement("span");
        this.enhancedTooltipTitleText.className = "enhanced-tooltip-title-text";
        this.enhancedTooltipHeader.appendChild(this.enhancedTooltipTitleText);

        this.enhancedTooltipBadges = document.createElement("div");
        this.enhancedTooltipBadges.className = "enhanced-tooltip-badges";
        this.enhancedTooltipHeader.appendChild(this.enhancedTooltipBadges);

        this.enhancedTooltipBadgeMore = document.createElement("span");
        this.enhancedTooltipBadgeMore.className = "enhanced-tooltip-badge-more";
        this.enhancedTooltipBadgeMore.style.display = "none";
        this.enhancedTooltipBadges.appendChild(this.enhancedTooltipBadgeMore);

        this.enhancedTooltipDate = document.createElement("div");
        this.enhancedTooltipDate.className = "enhanced-tooltip-date";
        this.enhancedTooltipElement.appendChild(this.enhancedTooltipDate);

        this.enhancedTooltipContentContainer = document.createElement("div");
        this.enhancedTooltipContentContainer.className = "enhanced-tooltip-content-container";
        this.enhancedTooltipElement.appendChild(this.enhancedTooltipContentContainer);

        this.enhancedTooltipContent = document.createElement("div");
        this.enhancedTooltipContent.className = "enhanced-tooltip-content";
        this.enhancedTooltipContentContainer.appendChild(this.enhancedTooltipContent);

        this.enhancedTooltipMoreHint = document.createElement("div");
        this.enhancedTooltipMoreHint.className = "enhanced-tooltip-more-hint";
        this.enhancedTooltipMoreHint.style.display = "none";

        const hintIcon = document.createElement("span");
        hintIcon.className = "more-hint-icon";
        hintIcon.textContent = "ℹ";
        this.enhancedTooltipMoreHint.appendChild(hintIcon);

        const hintText = document.createElement("span");
        hintText.className = "more-hint-text";
        hintText.textContent = this.options.getLocalizedString?.("tooltip_clickToViewMore", "Click marker to view full details")
            || "Click marker to view full details";
        this.enhancedTooltipMoreHint.appendChild(hintText);

        this.enhancedTooltipElement.appendChild(this.enhancedTooltipMoreHint);

        this.target.appendChild(this.enhancedTooltipElement);

        this.target.addEventListener("mouseleave", () => {
            this.hideTooltip(true);
        });
    }

    public updateTooltipCssVariables(markerColor: string, rgbStr: string, textColor: string, textRgb: string): void {
        const setProps = (el: HTMLElement | null) => {
            if (!el || !el.style) return;
            el.style.setProperty('--tooltip-marker-color', markerColor);
            el.style.setProperty('--tooltip-marker-rgb', rgbStr);
            el.style.setProperty('--tooltip-text-color', textColor);
            el.style.setProperty('--tooltip-text-rgb', textRgb);
            if (this.currentTooltipFontFamily) {
                el.style.setProperty('--tooltipFontFamily', this.currentTooltipFontFamily);
            }
            if (this.currentTooltipFontSize > 0) {
                el.style.setProperty('--tooltipFontSize', `${this.currentTooltipFontSize}pt`);
            }
        };

        if (this.target) setProps(this.target as HTMLElement);
        if (typeof document !== 'undefined') {
            if (document.documentElement) setProps(document.documentElement);
            if (document.body) setProps(document.body);
        }
    }

    public applyEnhancedTooltipStyles(markerColor: string, rgbStr: string, textColor: string): void {
        if (typeof document === 'undefined') return;

        const applyDirect = () => {
            try {
                const tooltipSelectors = [
                    '.tooltip-container',
                    '.visual-tooltip-container',
                    'div[class*="tooltip-container"]',
                    'div[class*="visual-tooltip"]',
                    '.tooltip',
                    'div.vis-tooltip',
                    '.pbi-tooltip'
                ];
                const tooltips = document.querySelectorAll(tooltipSelectors.join(', '));
                tooltips.forEach((node: Element) => {
                    const el = node as HTMLElement;
                    if (!el || !el.style) return;
                    el.style.setProperty('--tooltip-marker-color', markerColor);
                    el.style.setProperty('--tooltip-marker-rgb', rgbStr);
                    el.style.setProperty('--tooltip-text-color', textColor);

                    if (this.currentTooltipFontFamily) {
                        el.style.fontFamily = this.currentTooltipFontFamily;
                    } else {
                        el.style.fontFamily = "'Segoe UI', 'wf_segoe-ui_normal', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif";
                    }
                    if (this.currentTooltipFontSize > 0) {
                        el.style.fontSize = `${this.currentTooltipFontSize}pt`;
                    } else {
                        el.style.fontSize = '12px';
                    }
                    el.style.lineHeight = '1.45';
                    el.style.backgroundColor = `rgba(${rgbStr}, 0.88)`;
                    el.style.color = textColor;
                    el.style.opacity = '0.92';
                    el.style.backdropFilter = 'blur(8px) saturate(160%)';
                    el.style.borderRadius = '6px';
                    el.style.border = `1px solid rgba(${rgbStr}, 0.95)`;
                    el.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.14)';

                    el.style.pointerEvents = 'auto';

                    const innerTexts = el.querySelectorAll('td, th, p, span, div, .tooltip-title-cell, .tooltip-value-cell, .tooltip-row');
                    innerTexts.forEach((inner: Element) => {
                        const inEl = inner as HTMLElement;
                        if (!inEl || !inEl.style) return;
                        inEl.style.color = textColor;
                        if (this.currentTooltipFontFamily) {
                            inEl.style.fontFamily = this.currentTooltipFontFamily;
                        } else {
                            inEl.style.fontFamily = "'Segoe UI', 'wf_segoe-ui_normal', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif";
                        }
                        inEl.style.backgroundColor = 'transparent';
                        inEl.style.whiteSpace = 'pre-wrap';

                        if (inEl.children.length === 0 && inEl.textContent) {
                            const rawText = inEl.textContent;
                            if (/<([a-z][a-z0-9]*)\b[^>]*>/i.test(rawText) || (rawText.includes('&lt;') && rawText.includes('&gt;'))) {
                                inEl.textContent = formatContentForTooltip(rawText);
                            }
                        }
                    });
                });
            } catch {
                // Safeguard against sandbox exceptions
            }
        };

        applyDirect();
        if (typeof window !== 'undefined') {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(applyDirect);
            }
            setTimeout(applyDirect, 30);
        }
    }

    public showEnhancedColorTooltip(
        clientX: number,
        clientY: number,
        info: EnhancedTooltipInfo
    ): void {
        if (!this.enhancedTooltipElement || !this.target) return;

        // Reset classes and apply any event classes
        this.enhancedTooltipElement.className = "enhanced-color-tooltip";
        if (info.eventClasses && info.eventClasses.length > 0) {
            info.eventClasses.forEach(cls => {
                if (cls) this.enhancedTooltipElement.classList.add(cls);
            });
        }

        if (this.currentTooltipFontFamily) {
            this.enhancedTooltipElement.style.setProperty('--tooltipFontFamily', this.currentTooltipFontFamily);
            this.enhancedTooltipElement.style.fontFamily = this.currentTooltipFontFamily;
        } else {
            this.enhancedTooltipElement.style.removeProperty('--tooltipFontFamily');
            this.enhancedTooltipElement.style.fontFamily = '';
        }
        if (this.currentTooltipFontSize > 0) {
            this.enhancedTooltipElement.style.setProperty('--tooltipFontSize', `${this.currentTooltipFontSize}pt`);
        } else {
            this.enhancedTooltipElement.style.removeProperty('--tooltipFontSize');
        }

        // Title text
        if (this.enhancedTooltipTitleText) {
            this.enhancedTooltipTitleText.textContent = info.headerText || '';
        }

        // More count badge
        if (this.enhancedTooltipBadgeMore) {
            if (info.moreCount && info.moreCount > 0) {
                this.enhancedTooltipBadgeMore.textContent = `+ ${info.moreCount} more`;
                this.enhancedTooltipBadgeMore.style.display = 'inline-flex';
            } else {
                this.enhancedTooltipBadgeMore.style.display = 'none';
            }
        }

        // Header and border styling mirroring .details-item-card and .details-item-event-type
        const hc = this.options.getHighContrastSettings();
        const { r, g, b } = info.rgb;

        if (hc.isHighContrast) {
            this.enhancedTooltipElement.style.border = `2px solid ${hc.foregroundSelected || hc.foreground || "#ffffff"}`;
            this.enhancedTooltipElement.style.backgroundColor = hc.background || "#000000";
            if (this.enhancedTooltipHeader) {
                this.enhancedTooltipHeader.style.backgroundColor = "transparent";
                this.enhancedTooltipHeader.style.borderBottom = `1px solid ${hc.foreground || "#ffffff"}`;
                this.enhancedTooltipHeader.style.borderLeft = `4px solid ${hc.foreground || "#ffffff"}`;
            }
            if (this.enhancedTooltipTitleText) {
                this.enhancedTooltipTitleText.style.color = hc.foreground || "#ffffff";
            }
            if (this.enhancedTooltipDate) {
                this.enhancedTooltipDate.style.color = hc.foreground || "#ffffff";
            }
            if (this.enhancedTooltipContent) {
                this.enhancedTooltipContent.style.color = hc.foreground || "#ffffff";
            }
            if (this.enhancedTooltipBadgeMore) {
                this.enhancedTooltipBadgeMore.style.borderColor = hc.foreground || "#ffffff";
                this.enhancedTooltipBadgeMore.style.color = hc.foreground || "#ffffff";
                this.enhancedTooltipBadgeMore.style.backgroundColor = "transparent";
            }
            if (this.enhancedTooltipMoreHint) {
                this.enhancedTooltipMoreHint.style.color = hc.foreground || "#ffffff";
                this.enhancedTooltipMoreHint.style.borderTopColor = hc.foreground || "#ffffff";
                this.enhancedTooltipMoreHint.style.backgroundColor = "transparent";
            }
        } else {
            if (info.flagInfo) {
                this.enhancedTooltipElement.style.border = `2.5px solid ${info.flagInfo.color}`;
            } else {
                this.enhancedTooltipElement.style.border = `2px solid ${info.markerColor}`;
            }
            this.enhancedTooltipElement.style.backgroundColor = "#ffffff";
            if (this.enhancedTooltipHeader) {
                this.enhancedTooltipHeader.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.45)`;
                this.enhancedTooltipHeader.style.borderBottom = `1px solid rgba(${r}, ${g}, ${b}, 0.65)`;
                if (info.flagInfo) {
                    this.enhancedTooltipHeader.style.borderLeft = `4px solid ${info.flagInfo.color}`;
                } else {
                    this.enhancedTooltipHeader.style.borderLeft = `4px solid ${info.markerColor}`;
                }
            }
            if (this.enhancedTooltipTitleText) {
                this.enhancedTooltipTitleText.style.color = "#1b1b1b";
            }
            if (this.enhancedTooltipDate) {
                this.enhancedTooltipDate.style.color = "#605e5c";
            }
            if (this.enhancedTooltipContent) {
                this.enhancedTooltipContent.style.color = "#201f1e";
            }
            if (this.enhancedTooltipBadgeMore) {
                this.enhancedTooltipBadgeMore.style.backgroundColor = "rgba(255, 255, 255, 0.75)";
                this.enhancedTooltipBadgeMore.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
                this.enhancedTooltipBadgeMore.style.color = "#1b1b1b";
            }
            if (this.enhancedTooltipMoreHint) {
                this.enhancedTooltipMoreHint.style.color = "#605e5c";
                this.enhancedTooltipMoreHint.style.borderTopColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
                this.enhancedTooltipMoreHint.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.08)`;
            }
        }

        if (info.flagInfo) {
            this.enhancedTooltipElement.style.setProperty('--flag-color', info.flagInfo.color);
        } else {
            this.enhancedTooltipElement.style.removeProperty('--flag-color');
        }

        // Sash overlay: draw a line across the element as an overlay
        let sashEl = this.enhancedTooltipElement.querySelector('.tooltip-sash-overlay') as HTMLElement;
        if (info.sashInfo) {
            this.enhancedTooltipElement.style.setProperty('--sash-color', info.sashInfo.color);
            if (!sashEl) {
                sashEl = document.createElement('div');
                sashEl.className = 'tooltip-sash-overlay';
                this.enhancedTooltipElement.appendChild(sashEl);
            }
            sashEl.style.display = 'block';
            sashEl.style.setProperty('--sash-color', info.sashInfo.color);
        } else {
            this.enhancedTooltipElement.style.removeProperty('--sash-color');
            if (sashEl) {
                sashEl.style.display = 'none';
            }
        }

        // Date subheader
        if (this.enhancedTooltipDate) {
            this.enhancedTooltipDate.textContent = info.dateStr || '';
            this.enhancedTooltipDate.style.display = info.dateStr ? 'block' : 'none';
        }

        // Content container
        if (this.enhancedTooltipContent && this.enhancedTooltipContentContainer) {
            if (info.contentVal && info.contentVal.trim().length > 0) {
                renderHtmlContent(this.enhancedTooltipContent, info.contentVal);
                this.enhancedTooltipContentContainer.style.display = 'block';
            } else {
                this.enhancedTooltipContent.textContent = '';
                this.enhancedTooltipContentContainer.style.display = 'none';
            }
        }

        // Show element to measure dimensions
        this.enhancedTooltipElement.style.display = 'block';
        this.enhancedTooltipElement.setAttribute("aria-hidden", "false");

        // Check if content overflows max-height (320px) and toggle hint
        if (this.enhancedTooltipMoreHint) {
            const hasContent = !!(info.contentVal && info.contentVal.trim().length > 0);
            const isContentOverflowing = hasContent && this.enhancedTooltipContent &&
                (this.enhancedTooltipContent.scrollHeight > this.enhancedTooltipContent.clientHeight + 2);
            if (isContentOverflowing) {
                this.enhancedTooltipMoreHint.style.display = 'flex';
                this.enhancedTooltipContent.classList.add('has-overflow');
            } else {
                this.enhancedTooltipMoreHint.style.display = 'none';
                this.enhancedTooltipContent.classList.remove('has-overflow');
            }
        }

        const targetRect = this.target.getBoundingClientRect();
        const mouseX = clientX - targetRect.left;
        const mouseY = clientY - targetRect.top;

        const tooltipWidth = this.enhancedTooltipElement.offsetWidth || 240;
        const tooltipHeight = this.enhancedTooltipElement.offsetHeight || 90;
        const containerWidth = this.target.clientWidth;
        const containerHeight = this.target.clientHeight;

        const offsetX = 14;
        const offsetY = 14;

        let posX = mouseX + offsetX;
        let posY = mouseY + offsetY;

        // Flip to left if overflowing right edge
        if (posX + tooltipWidth > containerWidth - 10) {
            posX = mouseX - tooltipWidth - offsetX;
        }
        // Clamp to left
        if (posX < 8) {
            posX = 8;
        }

        // Flip to top if overflowing bottom edge
        if (posY + tooltipHeight > containerHeight - 10) {
            posY = mouseY - tooltipHeight - offsetY;
        }
        // Clamp to top
        if (posY < 8) {
            posY = 8;
        }

        this.enhancedTooltipElement.style.left = `${Math.round(posX)}px`;
        this.enhancedTooltipElement.style.top = `${Math.round(posY)}px`;
        this.enhancedTooltipElement.style.opacity = '1';
    }

    public hideEnhancedColorTooltip(): void {
        if (!this.enhancedTooltipElement) return;
        this.enhancedTooltipElement.style.display = 'none';
        this.enhancedTooltipElement.style.opacity = '0';
        this.enhancedTooltipElement.setAttribute("aria-hidden", "true");
        if (this.enhancedTooltipMoreHint) {
            this.enhancedTooltipMoreHint.style.display = 'none';
        }
    }

    public hideTooltip(immediately: boolean = false): void {
        this.hideEnhancedColorTooltip();
        if (this.tooltipService) {
            this.tooltipService.hide({
                isTouchEvent: false,
                immediately: immediately
            });
        }
    }

    public isTooltipsEnabled(formattingSettings: any, lastUpdateOptions: any): boolean {
        return formattingSettings?.elementsCard?.showTooltips?.value
            ?? formattingSettings?.tooltipsCard?.show?.value
            ?? lastUpdateOptions?.dataViews?.[0]?.metadata?.objects?.elements?.show
            ?? lastUpdateOptions?.dataViews?.[0]?.metadata?.objects?.tooltips?.show
            ?? true;
    }

    public isCanvasTooltipConfigured(formattingSettings: any, lastUpdateOptions: any): boolean {
        const cardVal = formattingSettings?.tooltipsCard?.tooltipType?.value?.value
            ?? formattingSettings?.tooltipsCard?.tooltipType?.value;
        if (cardVal === 'canvas' || cardVal === 'report') {
            return true;
        }
        const objVal = lastUpdateOptions?.dataViews?.[0]?.metadata?.objects?.tooltips?.tooltipType;
        if (objVal === 'canvas' || objVal === 'report') {
            return true;
        }
        return false;
    }

    public showTooltipForPointer(
        clientX: number,
        clientY: number,
        formattingSettings: any,
        lastUpdateOptions: any,
        fallbackItemId?: any
    ): void {
        if (!this.isTooltipsEnabled(formattingSettings, lastUpdateOptions)) {
            this.hideTooltip(true);
            return;
        }

        const matchedItems = this.options.getItemsUnderPointer(clientX, clientY);
        if (matchedItems.length === 0 && fallbackItemId != null) {
            const fb = this.options.getItemById(fallbackItemId);
            if (fb && fb.type !== 'background') {
                matchedItems.push(fb);
            }
        }

        if (matchedItems.length === 0) {
            this.hideTooltip(true);
            return;
        }

        const firstItem = matchedItems[0];
        if (!firstItem) return;

        const rawEventClass = (firstItem.eventClass || firstItem.originalClass || '').trim();
        const eventClasses = rawEventClass ? rawEventClass.split(/\s+/).filter(Boolean) : [];
        const flagInfo = extractFlagClass(rawEventClass);
        const sashInfo = extractSashClass(rawEventClass);
        const markerColor = normalizeColor(firstItem.color, '#3677a8');
        const primaryEventType = firstItem.eventType || firstItem.group || "Event";
        const moreCount = matchedItems.length - 1;
        const headerText = primaryEventType;

        const dateStr = formatEventDate(firstItem.start, firstItem.end, firstItem.isOngoing) || firstItem.dateString || '';
        const showFieldNames = this.options.getShowFieldNames();
        const contentVal = getItemContent(firstItem, showFieldNames);

        const rgb = getRgbFromColor(markerColor);
        const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        const { textColor, textRgb } = getReadableTextColorForBg(rgb.r, rgb.g, rgb.b);

        // Check if report page canvas tooltip is configured
        if (this.isCanvasTooltipConfigured(formattingSettings, lastUpdateOptions) && this.tooltipService) {
            this.hideEnhancedColorTooltip();
            const canvasHeaderText = moreCount > 0
                ? `${primaryEventType} (+ ${moreCount} more)`
                : primaryEventType;
            const dataItems: VisualTooltipDataItem[] = [
                {
                    header: sanitizeHtmlToText(canvasHeaderText),
                    displayName: '',
                    value: dateStr || '',
                    color: markerColor,
                    opacity: '0.88'
                }
            ];

            const sanitizedContent = formatContentForTooltip(contentVal);
            if (sanitizedContent) {
                dataItems.push({
                    displayName: '',
                    value: sanitizedContent,
                    color: markerColor,
                    opacity: '0.88'
                });
            }

            this.updateTooltipCssVariables(markerColor, rgbStr, textColor, textRgb);

            this.tooltipService.show({
                coordinates: [Math.max(0, clientX - 40), Math.max(0, clientY - 40)],
                isTouchEvent: false,
                dataItems: dataItems,
                identities: firstItem.selectionId ? [firstItem.selectionId] : []
            });

            this.applyEnhancedTooltipStyles(markerColor, rgbStr, textColor);
            return;
        }

        // Otherwise, show our rich in-visual enhanced color tooltip
        if (this.tooltipService) {
            this.tooltipService.hide({ isTouchEvent: false, immediately: true });
        }

        this.updateTooltipCssVariables(markerColor, rgbStr, textColor, textRgb);
        this.showEnhancedColorTooltip(clientX, clientY, {
            headerText,
            dateStr,
            contentVal,
            markerColor,
            eventClasses,
            flagInfo,
            sashInfo,
            rgb,
            moreCount
        });
    }
}
