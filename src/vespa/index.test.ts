import { VespaHandler }  from './index';
import { ContractChild, VESPA_SCHEMA } from './types';
import {VespaResponse, FunctionEntry} from './types';

test('queries the vespa database for usdc', async () => {
    let vh = new VespaHandler();
    let result = await vh.query('usdc', VESPA_SCHEMA.CONTRACT);
    expect(result.data.root.children[0].fields.name).toBe('Circle USD')
});


test('get swap by id', async () => {
    let vh = new VespaHandler();
    let result = await vh.get_function_by_id('aave_withdraw');
    expect(result.data.fields.name).toBe('aave_withdraw')
});