import { PintxoTransactionResponse } from "../transactions/types"
import { PintxoDataResponse } from "../data/types"

export interface PintxoResponse {
    status: number,
    type: PINTXO_RESPONSE_TYPE,
    data: PintxoTransactionResponse | PintxoDataResponse
}

export enum PINTXO_RESPONSE_TYPE {
    TRANSACTION,
    DATA,
    ERROR,
}