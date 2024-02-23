import { text } from "stream/consumers";
import { CLASSIFIER_LEVELS } from "../lm/types";
import LMHandler from '../lm';
import TransactionHandler from "../transactions";
import DataHandler from "../data";
import { GeneralError } from "@feathersjs/errors";

let lm = new LMHandler();
let th = new TransactionHandler();
let dh = new DataHandler();

/// The entrypoint for all queries into the Pintxo API.
/// Responsible for handling malicious queries gracefully,
/// doing classifications and handing off to proper handlers.
class QueryHandler {
    async process(query: string) {
        // classify as 'transaction', 'query', or 'combo'
        let decision = await lm.classify(query, CLASSIFIER_LEVELS.LEVEL_ONE)

        if (decision == 'transaction') {
            return th.process(query)
        }
        else if (decision == 'query') {
            return dh.process(query)
        }
        else if (decision == 'combo') {
            return "TODO"
        }
    }
}

export default QueryHandler