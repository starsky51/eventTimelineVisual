/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as _moment from "moment";
const moment: any = (_moment as any).default || _moment;
import { isDateColumn, parseDate } from "./dateUtils";

export function openExternalUrl(url: string, host?: IVisualHost | null): void {
    if (!url || url === '#' || url.startsWith('javascript:')) return;
    if (host && typeof host.launchUrl === 'function') {
        try {
            host.launchUrl(url);
            return;
        } catch (err) {
            console.warn('host.launchUrl failed, attempting window.open:', err);
        }
    }
    try {
        window.open(url, '_blank');
    } catch (e) {
        console.warn('Failed to open URL:', e);
    }
}

export function bindAnchorLinkInteractions(
    a: HTMLAnchorElement,
    onOpenUrl?: (url: string) => void
): void {
    if (!a) return;
    const targetUrl = a.getAttribute('href') || a.href;
    a.removeAttribute('target');
    a.setAttribute('rel', 'noopener noreferrer');
    if (targetUrl) {
        a.setAttribute('title', targetUrl);
    }
    a.textContent = 'View';

    const handleLinkClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const urlToOpen = a.getAttribute('href') || a.href || targetUrl;
        if (urlToOpen && onOpenUrl) {
            onOpenUrl(urlToOpen);
        }
    };

    a.onclick = handleLinkClick;
    a.onauxclick = handleLinkClick;
    a.addEventListener('pointerdown', (e) => e.stopPropagation());
    a.addEventListener('mousedown', (e) => e.stopPropagation());
}

export function measureMaxTextWidth(
    strings: string[],
    font: string,
    fallbackCharWidth: number = 8.5
): number {
    if (!strings || strings.length === 0) return 0;
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.font = font;
            let maxWidth = 0;
            strings.forEach(s => {
                const w = ctx.measureText(s || "").width;
                if (w > maxWidth) maxWidth = w;
            });
            return maxWidth;
        }
    } catch {
        // Fall back to approximation if canvas is unavailable
    }
    let maxLen = 0;
    strings.forEach(s => {
        if ((s || "").length > maxLen) maxLen = s.length;
    });
    return maxLen * fallbackCharWidth;
}

export function textContainsTerm(source: any, term: string): boolean {
    if (!source || !term) return false;
    return String(source).toLowerCase().includes(term);
}

export function setElementCssVar(
    el: HTMLElement | null | undefined,
    name: string,
    value: string | null | undefined
): void {
    if (!el || !el.style) return;
    if (value != null && value !== '') {
        el.style.setProperty(name, value);
    } else {
        el.style.removeProperty(name);
    }
}

export function sanitizeHtmlToText(content: string): string {
    if (!content) return '';
    let str = String(content);

    if (/&lt;\/?[a-z][a-z0-9]*\b/i.test(str)) {
        try {
            const doc = new DOMParser().parseFromString(str, 'text/html');
            str = doc.body.textContent || str;
        } catch {
            str = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
    }

    str = str.replace(/\\n/g, '\n');

    const hasHtmlTags = /<[\/!]?[a-z][\s\S]*>/i.test(str);
    const hasEntities = /&[a-z0-9#]+;/i.test(str);
    if (!hasHtmlTags && !hasEntities) {
        return str.trim();
    }

    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    str = str.replace(/<br\s*\/?>/gi, '\n');
    str = str.replace(/<\/p\s*>/gi, '\n');
    str = str.replace(/<\/div\s*>/gi, '\n');
    str = str.replace(/<\/tr\s*>/gi, '\n');
    str = str.replace(/<li\b[^>]*>/gi, '• ');
    str = str.replace(/<\/li\s*>/gi, '\n');
    str = str.replace(/<\/h[1-6]\s*>/gi, '\n');
    str = str.replace(/<hr\s*\/?>/gi, '\n');
    str = str.replace(/<\/td\s*>/gi, ' ');
    str = str.replace(/<\/th\s*>/gi, ' ');

    let text = '';
    if (typeof DOMParser !== 'undefined') {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(str, 'text/html');
            doc.body.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            text = doc.body.textContent || '';
        } catch {}
    }

    if (!text && str) {
        try {
            const doc = new DOMParser().parseFromString(str, 'text/html');
            text = doc.body.textContent || '';
        } catch {
            text = str.replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/&quot;/gi, '"')
                .replace(/&#39;|&apos;/gi, "'");
        }
    }

    text = text.replace(/\u00A0/g, ' ');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n');
    return text.split('\n').map(l => l.trimEnd()).join('\n').trim();
}

export function buildUrlFragment(
    text: string,
    ownerDoc: Document = document,
    onOpenUrl?: (url: string) => void,
    bindInteractions: boolean = true
): DocumentFragment {
    const fragment = ownerDoc.createDocumentFragment();
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    const parts = text.split(urlRegex);
    for (const part of parts) {
        if (/^https?:\/\//i.test(part)) {
            const a = ownerDoc.createElement('a');
            a.setAttribute('href', part);
            a.textContent = 'View';
            if (bindInteractions) {
                bindAnchorLinkInteractions(a as HTMLAnchorElement, onOpenUrl);
            }
            fragment.appendChild(a);
        } else if (part) {
            fragment.appendChild(ownerDoc.createTextNode(part));
        }
    }
    return fragment;
}

export function renderHtmlContent(
    container: HTMLElement,
    content: string,
    onOpenUrl?: (url: string) => void
): void {
    if (!container) return;
    if (!content) {
        container.textContent = '';
        return;
    }

    let htmlString = String(content);
    if (htmlString.includes('&lt;') && htmlString.includes('&gt;') && !htmlString.includes('<')) {
        try {
            const doc = new DOMParser().parseFromString(htmlString, 'text/html');
            htmlString = doc.body.textContent || htmlString;
        } catch {
            htmlString = htmlString.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
    }

    const hasTags = /<([a-z][a-z0-9]*)\b[^>]*>/i.test(htmlString);
    if (!hasTags) {
        container.textContent = '';
        container.appendChild(buildUrlFragment(htmlString, document, onOpenUrl, true));
        return;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        doc.body.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());

        // Auto-link any plain text URLs in text nodes that are not inside an anchor
        const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.parentElement?.tagName.toLowerCase() === 'a') {
                    return NodeFilter.FILTER_REJECT;
                }
                return urlRegex.test(node.nodeValue || '')
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode as Text);
        }
        for (const node of textNodes) {
            node.replaceWith(buildUrlFragment(node.nodeValue || '', doc, onOpenUrl, false));
        }

        container.textContent = '';
        while (doc.body.firstChild) {
            container.appendChild(doc.body.firstChild);
        }

        container.querySelectorAll('a').forEach(a => {
            bindAnchorLinkInteractions(a as HTMLAnchorElement, onOpenUrl);
        });
    } catch {
        container.textContent = '';
        container.appendChild(buildUrlFragment(htmlString, document, onOpenUrl, true));
    }
}

export function highlightSearchTermInElement(
    container: HTMLElement,
    term: string
): void {
    if (!container || !term) return;
    const trimmed = term.trim();
    if (trimmed.length === 0) return;

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex: RegExp;
    try {
        regex = new RegExp(`(${escaped})`, 'gi');
    } catch {
        return;
    }

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
    }

    for (const textNode of textNodes) {
        const parent = textNode.parentElement;
        if (parent) {
            const tag = parent.tagName.toLowerCase();
            if (tag === 'mark' || tag === 'script' || tag === 'style') {
                continue;
            }
        }

        const text = textNode.nodeValue;
        if (!text) continue;

        regex.lastIndex = 0;
        if (!regex.test(text)) continue;

        regex.lastIndex = 0;
        const parts = text.split(regex);
        if (parts.length <= 1) continue;

        const frag = document.createDocumentFragment();
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;
            if (i % 2 === 1) {
                const mark = document.createElement('mark');
                mark.className = 'details-search-highlight';
                mark.textContent = part;
                frag.appendChild(mark);
            } else {
                frag.appendChild(document.createTextNode(part));
            }
        }

        if (textNode.parentNode) {
            textNode.parentNode.replaceChild(frag, textNode);
        }
    }
}

export function formatContentFieldValue(val: any, col: any): string {
    if (val === null || val === undefined) return '';

    const isDateCol = isDateColumn(col);

    // 1. Direct Date instance
    if (val instanceof Date) {
        const parsed = parseDate(val);
        if (parsed && !isNaN(parsed.getTime())) {
            return moment(parsed).format('DD MMM YYYY HH:mm');
        }
    }

    // 2. Numeric timestamp if column is known date/time
    if (isDateCol && typeof val === 'number') {
        const parsed = parseDate(val);
        if (parsed && !isNaN(parsed.getTime())) {
            return moment(parsed).format('DD MMM YYYY HH:mm');
        }
    }

    // 3. String date representations
    if (typeof val === 'string') {
        const str = val.trim();
        if (str) {
            if (isDateCol) {
                const parsed = parseDate(str);
                if (parsed && !isNaN(parsed.getTime())) {
                    return moment(parsed).format('DD MMM YYYY HH:mm');
                }
            } else if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(str)
                || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?)?$/.test(str)) {
                const parsed = parseDate(str);
                if (parsed && !isNaN(parsed.getTime())) {
                    return moment(parsed).format('DD MMM YYYY HH:mm');
                }
            }
        }
    }

    return String(val).trim();
}
