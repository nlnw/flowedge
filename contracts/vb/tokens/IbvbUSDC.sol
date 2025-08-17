// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../IGenericCustomToken.sol";

/**
 * @title IbvbUSDC
 * @notice Interface for the Bridged Vault Bridge USDC token. This is deployed on the
 *   destination chain - for "Katana" this means Katana, for "Tatara" and "Bokuto"
 *   this means these respective testnets. The address for each context is different,
 *   and indicated in custom tags.
 * @dev Bridged representation of vault bridge USDC that can be minted/burned via bridge
 * @custom:tatara 0x102E14ffF48170F2e5b6d0e30259fCD4eE5E28aE
 * @custom:katana 0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36
 * @custom:bokuto 0xc2a4C310F2512A17Ac0047cf871aCAed3E62bB4B
 * @custom:tags vaultbridge,token,usdc,bridge,destination
 */
interface IbvbUSDC is IGenericCustomToken {

}