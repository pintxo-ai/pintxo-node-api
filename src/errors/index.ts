import { FeathersError } from '@feathersjs/errors'
import {LM_ERROR_DATA, VESPA_ERROR_CLASSES, LM_ERROR_CLASSES, VESPA_ERROR_DATA, TX_ERROR_CLASSES, TX_ERROR_DATA} from './types'

export class VespaError extends FeathersError {
    constructor(message: string, class_name: VESPA_ERROR_CLASSES, data: VESPA_ERROR_DATA) {
        super(message, 'VespaError', 500, class_name, data)
    }
}

export class LanguageModelError extends FeathersError {
    constructor(message: string, class_name: LM_ERROR_CLASSES, data: LM_ERROR_DATA) {
        super(message, 'LanguageModelError', 500, class_name, data)
    }
}

export class TransactionError extends FeathersError {
    constructor(message: string, class_name: TX_ERROR_CLASSES, data: TX_ERROR_DATA) {
        super(message, 'TransactionError', 500, class_name, data)
    }
}