import { createPublicDepositAddressRepository, publicDepositAddressMock, publicDepositAddressLogMock } from '../mock/publicDepositAddress.js'

// Shared across console pages so restoring inheritance uses the current public configuration.
export const publicDepositAddressRepository = createPublicDepositAddressRepository(publicDepositAddressMock, publicDepositAddressLogMock)
