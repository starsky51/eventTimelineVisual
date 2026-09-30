import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import Model = formattingSettings.Model;
import visuals = powerbi.visuals;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
export declare class FormattingSettingsService {
    private localizationManager?;
    constructor(localizationManager?: ILocalizationManager);
    /**
     * Build visual formatting settings model from metadata dataView
     */
    populateFormattingSettingsModel<T extends Model>(typeClass: new () => T, dataView: powerbi.DataView): T;
    /**
     * Build formatting model by parsing formatting settings model object
     */
    buildFormattingModel(formattingSettingsModel: Model): visuals.FormattingModel;
    private buildFormattingSlices;
    private getRevertToDefaultDescriptor;
    private getSlicesRevertToDefaultDescriptor;
}
