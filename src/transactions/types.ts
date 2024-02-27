import { Prerequisite } from '../vespa/types'

export interface PintxoTransactionResponse {
    function: string,
    signature: string,
    functional_signature: string,
    contract_address: string,
    prerequisites?: Prerequisite[],
    args: Record<string, string>
}