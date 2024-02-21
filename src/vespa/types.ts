enum VALUE_TYPES {
    CONTRACT_ADDRESS,
    uint256
}

interface FunctionInputValues {
    name: string,
    schema: string,
    value_type: VALUE_TYPES,
}

interface VespaContractResponse {
    status: number,
    statusText: string,
    url: string,
    data: {
        root: VespaContractResponseData
    },
}

interface VespaDocumentResponse {
    data: FunctionSchema
}

interface VespaContractResponseData {
    id: string,
    relevance: number,
    fields: any,
    coverage: any,
    children: ContractSchema[]
}

interface ContractSchema {
    id: string,
    relevance: string,
    fields: {
        documentid: string,
        decimals: string,
        name: string,
        description: string,
        signature: string,
        functional_signature: string,
        address: string,
        prerequisites: string[],
        input_values: FunctionInputValues[]
    }
}

interface VespaFunctionResponse {
    status: number,
    statusText: string,
    url: string,
    data: {
        root: VespaFunctionResponseData
    },
}

interface VespaFunctionResponseData {
    id: string,
    relevance: number,
    fields: any,
    coverage: any,
    children: FunctionSchema[]
}

interface FunctionSchema {
    id: string,
    relevance?: string,
    fields: {
        documentid: string,
        name: string,
        description: string,
        signature: string,
        functional_signature: string,
        address: string,
        prerequisites: string[],
        input_values: FunctionInputValues[]
    }
}

enum VESPA_SCHEMA {
    FUNCTION,
    CONTRACT,
    PROTOCOL,
    METRIC
}

export {VespaContractResponse, VESPA_SCHEMA, FunctionSchema, FunctionInputValues, VespaFunctionResponse, VespaDocumentResponse}