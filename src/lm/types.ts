export enum CLASSIFIER_LEVELS {
    LEVEL_ONE, // transaction, query, combo
    LEVEL_TWO
}

export interface InputValue {
    value: string,
    value_type: string
}