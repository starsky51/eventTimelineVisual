import { Graph2d } from "vis-timeline/peer";
import * as _moment from "moment";
type Moment = _moment.Moment;
export declare class MiniTimelineManager {
    miniTimelineContainer: HTMLElement;
    miniTimelineLeftSpacer: HTMLElement;
    miniShadeLeft: HTMLElement;
    miniShadeRight: HTMLElement;
    miniTimeline: Graph2d | null;
    activeMiniDragBar: 'selectStartTime' | 'selectEndTime' | null;
    private lastMiniScale;
    private lastMiniStep;
    constructor(parentArea: HTMLElement, visualInstanceId: string);
    updateMiniTimelineLayout(mainTimelineContainer: HTMLElement | null): void;
    updateMiniTimelineTimeAxis(width?: number): void;
    getMiniXFromTime(time: Date): number | null;
    getNearMiniDragBar(clientX: number): 'selectStartTime' | 'selectEndTime' | null;
    getMiniTimeFromX(clientX: number): Moment;
    setMiniShades(time1: Date, time2: Date): void;
}
export {};
