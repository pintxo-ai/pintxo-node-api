import { text } from "stream/consumers";
import { CLASSIFIER_LEVELS } from "../lm/types";
import LMHandler from '../lm';
import TransactionHandler from "../transactions";

let lm = new LMHandler();
let th = new TransactionHandler();

/// The entrypoint for all queries into the Pintxo API.
/// Responsible for handling malicious queries gracefully,
/// doing classifications and handing off to proper handlers.
class QueryHandler {
    async process(query: string) {
        // classify as 'transaction', 'query', or 'combo'
        let decision = await lm.classify(decodeURIComponent(query), CLASSIFIER_LEVELS.LEVEL_ONE)

        if (decision == 'transaction') {
            return th.process(decodeURIComponent(query))
        }
        else if (decision == 'query') {
            // alex this is where you can jump in with perplexity/other decision tree stuff
            return "Todo!"
        }
    }
}

export default QueryHandler