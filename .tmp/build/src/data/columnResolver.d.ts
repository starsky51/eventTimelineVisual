import powerbi from "powerbi-visuals-api";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { ColumnRolesResult } from "../types";
export declare function resolveColumnRoles(columns: powerbi.DataViewMetadataColumn[], options: VisualUpdateOptions): ColumnRolesResult;
