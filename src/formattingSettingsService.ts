import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import CompositeCard = formattingSettings.CompositeCard;
import SimpleCard = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import Slice = formattingSettings.Slice;

import visuals = powerbi.visuals;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

export class FormattingSettingsService {
    private localizationManager?: ILocalizationManager;

    constructor(localizationManager?: ILocalizationManager) {
        this.localizationManager = localizationManager;
    }

    /**
     * Build visual formatting settings model from metadata dataView
     */
    public populateFormattingSettingsModel<T extends Model>(typeClass: new () => T, dataView: powerbi.DataView): T {
        const defaultSettings = new typeClass();
        const dataViewObjects = dataView?.metadata?.objects;

        const fallbackMap: { [objectName: string]: { [propName: string]: string } } = {
            general: {
                minZoom: "timeline",
                keepRangeMarkers: "markers"
            },
            elements: {
                showFutureEvents: "timeline",
                show: "tooltips",
                showSearch: "topBar"
            },
            miscellaneous: {
                collapseSubgroupsOnLoad: "groupOrderCard",
                crossFilter: "markers"
            }
        };

        const setSliceValue = (slice: any, objName: string) => {
            if (!slice) return;
            slice.setPropertiesValues(dataViewObjects, objName);
            const fallbackObj = fallbackMap[objName]?.[slice.name];
            if (fallbackObj && dataViewObjects?.[fallbackObj]?.[slice.name] !== undefined && dataViewObjects?.[objName]?.[slice.name] === undefined) {
                slice.setPropertiesValues(dataViewObjects, fallbackObj);
            }
        };

        if (dataViewObjects) {
            defaultSettings.cards?.forEach((card) => {
                if (card instanceof CompositeCard && card.topLevelSlice) {
                    setSliceValue(card.topLevelSlice, card.name);
                }
                const cardGroupInstances = (card instanceof SimpleCard ? [card] : card.groups);
                cardGroupInstances?.forEach((cardGroupInstance: any) => {
                    const objectName = cardGroupInstance.name || card.name;
                    if (cardGroupInstance.topLevelSlice) {
                        setSliceValue(cardGroupInstance.topLevelSlice, objectName);
                    }
                    cardGroupInstance.slices?.forEach((slice: any) => {
                        setSliceValue(slice, objectName);
                    });
                    cardGroupInstance.container?.containerItems?.forEach((containerItem: any) => {
                        containerItem?.slices?.forEach((slice: any) => {
                            setSliceValue(slice, objectName);
                        });
                    });
                });
            });
        }
        return defaultSettings;
    }

    /**
     * Build formatting model by parsing formatting settings model object
     */
    public buildFormattingModel(formattingSettingsModel: Model): visuals.FormattingModel {
        const formattingModel: visuals.FormattingModel = {
            cards: []
        };

        formattingSettingsModel.cards
            ?.filter(({ visible = true }) => visible)
            .forEach((card) => {
                const formattingCard: visuals.FormattingCard = {
                    displayName: (this.localizationManager && card.displayNameKey)
                        ? this.localizationManager.getDisplayName(card.displayNameKey)
                        : card.displayName,
                    description: (this.localizationManager && card.descriptionKey)
                        ? this.localizationManager.getDisplayName(card.descriptionKey)
                        : card.description,
                    groups: [],
                    uid: card.name + "-card",
                    analyticsPane: card.analyticsPane,
                };

                const cardObjectName = card.name;
                if (card.topLevelSlice) {
                    const topLevelToggleSlice = card.topLevelSlice.getFormattingSlice(cardObjectName, this.localizationManager) as visuals.EnabledSlice;
                    topLevelToggleSlice.suppressDisplayName = true;
                    formattingCard.topLevelToggle = topLevelToggleSlice;
                }

                card.onPreProcess?.();

                const isSimpleCard = card instanceof SimpleCard;
                const cardGroupInstances = (isSimpleCard
                    ? [card].filter(({ visible = true }) => visible)
                    : card.groups?.filter(({ visible = true }) => visible) || []);

                cardGroupInstances.forEach((cardGroupInstance: any) => {
                    const groupUid = (cardGroupInstance.displayName == null ? card.name + "-main" : cardGroupInstance.name) + "-group";
                    const objectName = cardGroupInstance.name || cardObjectName;

                    const formattingGroup: visuals.FormattingGroup = {
                        displayName: isSimpleCard
                            ? undefined
                            : ((this.localizationManager && cardGroupInstance.displayNameKey)
                                ? this.localizationManager.getDisplayName(cardGroupInstance.displayNameKey)
                                : cardGroupInstance.displayName),
                        description: isSimpleCard
                            ? undefined
                            : ((this.localizationManager && cardGroupInstance.descriptionKey)
                                ? this.localizationManager.getDisplayName(cardGroupInstance.descriptionKey)
                                : cardGroupInstance.description),
                        slices: [],
                        uid: groupUid,
                        collapsible: cardGroupInstance.collapsible,
                        delaySaveSlices: cardGroupInstance.delaySaveSlices,
                        disabled: cardGroupInstance.disabled,
                        disabledReason: cardGroupInstance.disabledReason,
                    };
                    formattingCard.groups.push(formattingGroup);

                    const sliceNames: { [name: string]: number } = {};

                    if (cardGroupInstance.container) {
                        const container = cardGroupInstance.container;
                        const containerUid = groupUid + "-container";
                        const formattingContainer: visuals.FormattingContainer = {
                            displayName: (this.localizationManager && container.displayNameKey)
                                ? this.localizationManager.getDisplayName(container.displayNameKey)
                                : container.displayName,
                            description: (this.localizationManager && container.descriptionKey)
                                ? this.localizationManager.getDisplayName(container.descriptionKey)
                                : container.description,
                            containerItems: [],
                            uid: containerUid
                        };

                        container.containerItems?.forEach((containerItem: any) => {
                            const containerItemName = containerItem.displayNameKey
                                ? containerItem.displayNameKey
                                : containerItem.displayName;
                            const containerItemUid = containerUid + containerItemName;
                            const formattingContainerItem: visuals.FormattingContainerItem = {
                                displayName: (this.localizationManager && containerItem.displayNameKey)
                                    ? this.localizationManager.getDisplayName(containerItem.displayNameKey)
                                    : containerItem.displayName,
                                slices: [],
                                uid: containerItemUid
                            };
                            this.buildFormattingSlices({
                                slices: containerItem.slices,
                                objectName,
                                sliceNames,
                                formattingSlices: formattingContainerItem.slices
                            });
                            formattingContainer.containerItems.push(formattingContainerItem);
                        });
                        formattingGroup.container = formattingContainer;
                    }

                    if (cardGroupInstance.topLevelSlice) {
                        const topLevelToggleSlice = cardGroupInstance.topLevelSlice.getFormattingSlice(objectName, this.localizationManager) as visuals.EnabledSlice;
                        topLevelToggleSlice.suppressDisplayName = true;
                        (formattingGroup.displayName == undefined ? formattingCard : formattingGroup).topLevelToggle = topLevelToggleSlice;
                    }

                    if (cardGroupInstance.slices) {
                        this.buildFormattingSlices({
                            slices: cardGroupInstance.slices,
                            objectName,
                            sliceNames,
                            formattingSlices: formattingGroup.slices
                        });
                    }
                });

                formattingCard.revertToDefaultDescriptors = this.getRevertToDefaultDescriptor(card);
                formattingModel.cards.push(formattingCard);
            });

        return formattingModel;
    }

    private buildFormattingSlices({ slices, objectName, sliceNames, formattingSlices }: {
        slices: Slice[];
        objectName: string;
        sliceNames: { [name: string]: number };
        formattingSlices: (visuals.FormattingSlice | visuals.FormattingSlicePlaceholder)[];
    }) {
        slices?.filter(({ visible = true }) => visible).forEach((slice) => {
            const formattingSlice = slice?.getFormattingSlice(objectName, this.localizationManager);
            if (formattingSlice) {
                if (sliceNames[slice.name] === undefined) {
                    sliceNames[slice.name] = 0;
                } else {
                    sliceNames[slice.name]++;
                    formattingSlice.uid = `${formattingSlice.uid}-${sliceNames[slice.name]}`;
                }
                formattingSlices.push(formattingSlice);
            }
        });
    }

    private getRevertToDefaultDescriptor(card: any): visuals.FormattingDescriptor[] {
        const sliceNames: { [name: string]: boolean } = {};
        const revertToDefaultDescriptors: visuals.FormattingDescriptor[] = [];

        if (card instanceof CompositeCard && card.topLevelSlice) {
            revertToDefaultDescriptors.push(...(card.topLevelSlice.getRevertToDefaultDescriptor(card.name) || []));
        }

        const isSimpleCard = card instanceof SimpleCard;
        const cardGroupInstances = (isSimpleCard
            ? [card].filter(({ visible = true }) => visible)
            : card.groups?.filter(({ visible = true }) => visible) || []);

        cardGroupInstances.forEach((cardGroupInstance: any) => {
            const objectName = cardGroupInstance.name || card.name;
            const cardSlicesDefaultDescriptors = this.getSlicesRevertToDefaultDescriptor(
                objectName,
                cardGroupInstance.slices,
                sliceNames,
                cardGroupInstance.topLevelSlice
            );
            let cardContainerSlicesDefaultDescriptors: visuals.FormattingDescriptor[] = [];
            cardGroupInstance.container?.containerItems?.forEach((containerItem: any) => {
                cardContainerSlicesDefaultDescriptors = cardContainerSlicesDefaultDescriptors.concat(
                    this.getSlicesRevertToDefaultDescriptor(objectName, containerItem.slices, sliceNames)
                );
            });
            revertToDefaultDescriptors.push(...cardSlicesDefaultDescriptors.concat(cardContainerSlicesDefaultDescriptors));
        });

        return revertToDefaultDescriptors;
    }

    private getSlicesRevertToDefaultDescriptor(
        objectName: string,
        slices: Slice[],
        sliceNames: { [name: string]: boolean },
        topLevelSlice?: any
    ): visuals.FormattingDescriptor[] {
        let revertToDefaultDescriptors: visuals.FormattingDescriptor[] = [];
        if (topLevelSlice) {
            sliceNames[topLevelSlice.name] = true;
            revertToDefaultDescriptors = revertToDefaultDescriptors.concat(topLevelSlice.getRevertToDefaultDescriptor(objectName) || []);
        }
        slices?.forEach((slice) => {
            if (slice && !sliceNames[slice.name]) {
                sliceNames[slice.name] = true;
                revertToDefaultDescriptors = revertToDefaultDescriptors.concat(slice.getRevertToDefaultDescriptor(objectName) || []);
            }
        });
        return revertToDefaultDescriptors;
    }
}
