import {reactive} from 'vue'
import {strategies} from './data'
import {createStrategyAccount,enrichStrategies} from './utils/strategyTemplates'
export const strategyCatalog=enrichStrategies(strategies)
export const strategyAccount=reactive(createStrategyAccount())
export const strategyFilters=reactive({style:'',market:'',sort:'sharpe_desc'})
