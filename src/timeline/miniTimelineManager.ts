/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import { Graph2d, TimelineTimeAxisScaleType } from "vis-timeline/peer";
import * as _moment from "moment";
type Moment = _moment.Moment;
const moment: any = (_moment as any).default || _moment;

export class MiniTimelineManager {
    public miniTimelineContainer: HTMLElement;
    public miniTimelineLeftSpacer: HTMLElement;
    public miniShadeLeft: HTMLElement;
    public miniShadeRight: HTMLElement;
    public miniTimeline: Graph2d | null = null;
    public activeMiniDragBar: 'selectStartTime' | 'selectEndTime' | null = null;

    private lastMiniScale: string = '';
    private lastMiniStep: number = 0;

    constructor(parentArea: HTMLElement, visualInstanceId: string) {
        this.miniTimelineContainer = document.createElement("div");
        this.miniTimelineContainer.id = "mini-timeline-" + visualInstanceId;
        this.miniTimelineContainer.classList.add("mini-timeline");
        parentArea.appendChild(this.miniTimelineContainer);

        // Spacer for non-interactive area to the left of the minitimeline
        this.miniTimelineLeftSpacer = document.createElement("div");
        this.miniTimelineLeftSpacer.className = "mini-timeline-left-spacer";
        this.miniTimelineLeftSpacer.addEventListener("pointerdown", (e: PointerEvent) => {
            e.stopPropagation();
            e.preventDefault();
        });
        this.miniTimelineLeftSpacer.addEventListener("mousedown", (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
        });
        this.miniTimelineLeftSpacer.addEventListener("pointermove", (e: PointerEvent) => {
            e.stopPropagation();
        });
        this.miniTimelineContainer.appendChild(this.miniTimelineLeftSpacer);

        // Shading elements
        this.miniShadeLeft = document.createElement('span');
        this.miniShadeLeft.setAttribute('id', 'minishadeleft');
        this.miniTimelineContainer.appendChild(this.miniShadeLeft);

        this.miniShadeRight = document.createElement('span');
        this.miniShadeRight.setAttribute('id', 'minishaderight');
        this.miniTimelineContainer.appendChild(this.miniShadeRight);
    }

    public updateMiniTimelineLayout(mainTimelineContainer: HTMLElement | null): void {
        try {
            if (!mainTimelineContainer || !this.miniTimelineContainer) return;
            const mainVisLabels = mainTimelineContainer.querySelector(".vis-panel.vis-left") as HTMLElement | null;
            const leftWidth = mainVisLabels ? (mainVisLabels.offsetWidth || mainVisLabels.clientWidth || 0) : 0;
            const safeLeftWidth = Math.max(0, Math.min(leftWidth, 400));
            const newPadding = safeLeftWidth + "px";
            if (this.miniTimelineContainer.style.paddingLeft !== newPadding) {
                this.miniTimelineContainer.style.paddingLeft = newPadding;
            }
            if (this.miniTimelineLeftSpacer) {
                this.miniTimelineLeftSpacer.style.width = newPadding;
            }

            if (this.miniTimeline) {
                this.updateMiniTimelineTimeAxis();
                this.miniTimeline.redraw();
                try {
                    const startTime = this.miniTimeline.getCustomTime('selectStartTime');
                    const endTime = this.miniTimeline.getCustomTime('selectEndTime');
                    if (startTime && endTime) {
                        this.setMiniShades(startTime, endTime);
                    }
                } catch {
                    // Custom time may not be set yet
                }
            }
        } catch (e) {
            console.warn("updateMiniTimelineLayout error:", e);
        }
    }

    public updateMiniTimelineTimeAxis(width?: number): void {
        if (!this.miniTimeline) return;
        try {
            const win = this.miniTimeline.getWindow();
            if (!win || !win.start || !win.end) return;

            let availableWidth = width;
            if (!availableWidth || availableWidth <= 0) {
                const bgVert = (this.miniTimeline as any)?.body?.dom?.backgroundVertical 
                    || (this.miniTimeline as any)?.dom?.backgroundVertical;
                if (bgVert) {
                    availableWidth = bgVert.getBoundingClientRect().width;
                }
            }
            if (!availableWidth || availableWidth <= 0) {
                availableWidth = this.miniTimelineContainer.clientWidth;
            }
            if (!availableWidth || availableWidth <= 0) return;

            const totalMs = win.end.valueOf() - win.start.valueOf();
            if (totalMs <= 0) return;

            // Dynamic X-axis markers: allow ~75px per marker so labels scale nicely with width
            const maxMarkers = Math.max(2, Math.floor(availableWidth / 75));
            const targetStepMs = totalMs / maxMarkers;

            const msPerDay = 86400 * 1000;
            const msPerMonth = 30.4375 * msPerDay;
            const msPerYear = 365.25 * msPerDay;

            let scale: TimelineTimeAxisScaleType = 'year';
            let step = 1;

            if (targetStepMs >= msPerYear * 0.75) {
                scale = 'year';
                const targetYears = targetStepMs / msPerYear;
                const yearSteps = [1, 2, 5, 10, 20, 25, 50, 100];
                step = yearSteps.reduce((prev, curr) => 
                    Math.abs(curr - targetYears) < Math.abs(prev - targetYears) ? curr : prev
                );
            } else if (targetStepMs >= msPerMonth * 0.75) {
                scale = 'month';
                const targetMonths = targetStepMs / msPerMonth;
                const monthSteps = [1, 2, 3, 4, 6];
                step = monthSteps.reduce((prev, curr) => 
                    Math.abs(curr - targetMonths) < Math.abs(prev - targetMonths) ? curr : prev
                );
            } else if (targetStepMs >= msPerDay * 0.75) {
                scale = 'day';
                const targetDays = targetStepMs / msPerDay;
                const daySteps = [1, 2, 5, 7, 14];
                step = daySteps.reduce((prev, curr) => 
                    Math.abs(curr - targetDays) < Math.abs(prev - targetDays) ? curr : prev
                );
            } else {
                scale = 'hour';
                const targetHours = targetStepMs / (3600 * 1000);
                const hourSteps = [1, 2, 4, 6, 12];
                step = hourSteps.reduce((prev, curr) => 
                    Math.abs(curr - targetHours) < Math.abs(prev - targetHours) ? curr : prev
                );
            }

            if (scale !== this.lastMiniScale || step !== this.lastMiniStep) {
                this.lastMiniScale = scale;
                this.lastMiniStep = step;
                this.miniTimeline.setOptions({
                    timeAxis: {
                        scale: scale,
                        step: step
                    }
                });
            }
        } catch (e) {
            console.warn("updateMiniTimelineTimeAxis error:", e);
        }
    }

    public getMiniXFromTime(time: Date): number | null {
        try {
            if (!this.miniTimeline || !time || isNaN(time.getTime())) return null;
            const win = this.miniTimeline.getWindow();
            if (!win || !win.start || !win.end) return null;

            const bgVert = (this.miniTimeline as any)?.body?.dom?.backgroundVertical 
                || (this.miniTimeline as any)?.dom?.backgroundVertical;
            if (!bgVert) return null;

            const rect = bgVert.getBoundingClientRect();
            const timelineWidth = rect.width;
            const timelineTimespan = moment(win.end).diff(win.start, 'milliseconds');
            if (timelineWidth <= 0 || timelineTimespan <= 0) return null;

            const targetMs = moment(time).diff(win.start, 'milliseconds');
            return rect.left + (targetMs / timelineTimespan) * timelineWidth;
        } catch {
            return null;
        }
    }

    public getNearMiniDragBar(clientX: number): 'selectStartTime' | 'selectEndTime' | null {
        if (!this.miniTimeline) return null;
        try {
            const startTime = this.miniTimeline.getCustomTime('selectStartTime');
            const endTime = this.miniTimeline.getCustomTime('selectEndTime');
            const startX = startTime ? this.getMiniXFromTime(startTime) : null;
            const endX = endTime ? this.getMiniXFromTime(endTime) : null;

            const distStart = startX !== null ? Math.abs(clientX - startX) : Infinity;
            const distEnd = endX !== null ? Math.abs(clientX - endX) : Infinity;

            const threshold = 22; // 22px hit area for reliable dragging
            if (distStart <= threshold && distStart <= distEnd) {
                return 'selectStartTime';
            } else if (distEnd <= threshold) {
                return 'selectEndTime';
            }
        } catch {}
        return null;
    }

    public getMiniTimeFromX(clientX: number): Moment {
        try {
            if (!this.miniTimeline) return moment();
            const win = this.miniTimeline.getWindow();
            if (!win || !win.start || !win.end) return moment();

            const bgVert = (this.miniTimeline as any)?.body?.dom?.backgroundVertical 
                || (this.miniTimeline as any)?.dom?.backgroundVertical;
            if (!bgVert) return moment(win.start);

            const rect = bgVert.getBoundingClientRect();
            const timelineWidth = rect.width;
            const timelineTimespan = moment(win.end).diff(win.start, 'milliseconds');

            if (timelineWidth <= 0 || timelineTimespan <= 0) return moment(win.start);

            const mouseX = Math.max(0, Math.min(timelineWidth, clientX - rect.left));
            const fraction = mouseX / timelineWidth;
            const mouseXMs = fraction * timelineTimespan;
            return moment(win.start).add(mouseXMs, 'milliseconds');
        } catch (e) {
            console.warn("getMiniTimeFromX error:", e);
            return moment();
        }
    }

    public setMiniShades(time1: Date, time2: Date): void {
        if (!this.miniShadeLeft || !this.miniShadeRight || !this.miniTimeline) return;
        try {
            const win = this.miniTimeline.getWindow();
            if (!win || !win.start || !win.end) return;

            const bgVert = (this.miniTimeline as any)?.body?.dom?.backgroundVertical 
                || (this.miniTimeline as any)?.dom?.backgroundVertical;
            if (!bgVert) return;

            const containerRect = this.miniTimelineContainer.getBoundingClientRect();
            const bgRect = bgVert.getBoundingClientRect();
            if (bgRect.width <= 0) return;

            const earliest = time1 < time2 ? time1 : time2;
            const latest = time1 > time2 ? time1 : time2;

            const totalMs = moment(win.end).diff(win.start, 'milliseconds');
            if (totalMs <= 0) return;

            const startMs = moment(earliest).diff(win.start, 'milliseconds');
            const endMs = moment(latest).diff(win.start, 'milliseconds');

            const leftOffset = bgRect.left - containerRect.left;
            const x1 = Math.max(0, Math.min(bgRect.width, (startMs / totalMs) * bgRect.width));
            const x2 = Math.max(0, Math.min(bgRect.width, (endMs / totalMs) * bgRect.width));

            this.miniShadeLeft.style.left = leftOffset + "px";
            this.miniShadeLeft.style.width = x1 + "px";

            this.miniShadeRight.style.left = (leftOffset + x2) + "px";
            this.miniShadeRight.style.width = Math.max(0, bgRect.width - x2) + "px";
        } catch (e) {
            console.warn("setMiniShades error:", e);
        }
    }
}

