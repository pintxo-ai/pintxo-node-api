import { Prerequisite } from '../vespa/types'

export interface PintxoTransactionResponse {
    type: string,
    function: string,
    description: string,
    signature: string,
    functional_signature: string,
    contract_address: string,
    prerequisites?: Prerequisite[],
    args: Record<string, string>
}