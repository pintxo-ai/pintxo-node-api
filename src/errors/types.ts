import { FunctionSchema } from "../vespa/types";

export enum VESPA_ERROR_CLASSES {
    NOT_FOUND = "NOT_FOUND",
    NOT_RUNNING = "NOT_RUNNING",
}

export enum LM_ERROR_CLASSES {
    BAD_YAML = "BAD_YAML",
    BAD_CLASSIFY = "BAD_CLASSIFY"
}

export enum TX_ERROR_CLASSES {
    FAILED_TX = "FAILED_TX",
    INVALID_ARGS = "INVALID_ARGS",
}


export interface GENERAL_ERROR_DATA {
    function: string,
    user_input?: string,
    inputs?: Record<string, string>,
    message: string, 
}

export interface LM_ERROR_DATA extends GENERAL_ERROR_DATA {
    first_generation: string,
    classification?: string,
    second_generation?: string
}

export interface TX_ERROR_DATA extends GENERAL_ERROR_DATA {
    function_signature: string,
    contract_to_call: string,
    top_functions?: string[]
    args: Record<string, string | number | { deploymentNonce: number; data: string; }[]>
}

export interface VESPA_ERROR_DATA extends GENERAL_ERROR_DATA {
    schema: string,
}