export enum CLASSIFIER_LEVELS {
    LEVEL_ONE, // transaction, query, combo
    LEVEL_TWO,
    DATA_LEVEL_ONE  // extracting document labels
}

export interface InputValue {
    value: string,
    value_type: string
}