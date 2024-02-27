
// Input types to function signatures
enum VALUE_TYPES {
    caller_address,
    address,
    uint256,
}

interface VespaError {
    error: {
        message: string,
        method: string,
        url: string
    }
}

interface NewFunctionSchema {
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

interface InputInfo {
    name: string
    type: string
    denominated_by?: string
}


// unify FunctionInputValues with PrerequisiteInputValues?
interface FunctionInputValues {
    name: string,
    type: string,
    denominated_by: string,
}

interface PrerequisiteInputValues {
    name: string,
    type: string,
    corresponds_to: string,
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
    data: NewFunctionSchema
}

interface VespaContractResponseData {
    id: string,
    relevance: number,
    fields: any,
    coverage: any,
    children: ContractSchema[]
}

export interface Prerequisite {
    id: string,
    contract_to_call: string,
    signature: string,
    inputs: PrerequisiteInputValues[]
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
        contract_address: string,
        prerequisites: Prerequisite[],
        inputs: FunctionInputValues[]
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
        contract_address: string,
        prerequisites: Prerequisite[],
        inputs: FunctionInputValues[]
    }
}

enum VESPA_SCHEMA {
    FUNCTION = 'function',
    CONTRACT = 'contract',
    PROTOCOL = 'protocol',
    METRIC = 'metric'
}

export {NewFunctionSchema, VespaContractResponse, VESPA_SCHEMA, VespaError, FunctionSchema, FunctionInputValues, VespaFunctionResponse, VespaDocumentResponse, VespaFunctionResponseData, VespaContractResponseData}