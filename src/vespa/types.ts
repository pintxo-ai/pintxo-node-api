export enum VESPA_RESPONSE_TYPE {
    CONTRACT,
    FUNCTION,
}

export interface VespaResponse {
    type: VESPA_RESPONSE_TYPE,
    data: {
        root: {
            id: string,
            relevance: number,
            fields: any
            coverage: {
                coverage: number,
                documents: number,
                full: boolean,
                nodes: number,
                results: number,
                resultsFull: number,
            }
            children: (ContractChild | FunctionEntry)[]
        }
    }

}

export interface ContractChild {
    pathId: string,
    id: string,
    relevance: number,
    source: string,
    fields: {
        matchFeatures: any,
        sddocname: string,
        documentid: string,
        name: string,
        type: string,
        contract_address: string,
        symbol: string,
        decimals: number,
    }
}

export interface FunctionEntry {
    pathId: string,
    id: string,
    fields: {
        description: string,
        functional_signature: string,
        contract_address: string,
        signature: string,
        name: string,
        inputs: Record<string, InputInfo>
        prerequisites?: Prerequisite[]
    }
}

export interface VespaDocumentResponse {
    data: FunctionEntry
}


export interface VespaError {
    error: {
        message: string,
        method: string,
        url: string
    }
}

interface InputInfo {
    name: string
    type: string
    denominated_by?: string
}


interface PrerequisiteInputValues {
    name: string,
    type: string,
    corresponds_to: string,
}

export interface Prerequisite {
    id: string,
    contract_to_call: string,
    signature: string,
    inputs: PrerequisiteInputValues[]
}

export enum VESPA_SCHEMA {
    FUNCTION = 'function',
    CONTRACT = 'contract',
    PROTOCOL = 'protocol',
    METRIC = 'metric'
}

