const path = require('path')

const tmp = require('tmp-promise')
const clone = require('git-clone/promise')

async function processViperswapTokens(data) {
  const dexMetadata = data.dexIdToDexMetadata.viperswap
  const dexId = dexMetadata.id

  console.log(`Parsing ${dexMetadata.__metadata__.communityTokensGitUrl}`)

  const tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexMetadata.__metadata__.communityTokensGitUrl, tmpDir.path)

  if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId]) {
    data.dexIdToChainIdTokenAddressToTokenMetadata[dexId] = {}
  }

  [
    {
      chainId: 1666600000,
      tokens: require(path.join(tmpDir.path, 'src/tokens/harmony-mainnet.json')),
    },
    {
      chainId: 1666700000,
      tokens: require(path.join(tmpDir.path, 'src/tokens/harmony-testnet.json')),
    },
  ]
  .forEach(({ chainId, tokens }) => {
    if (!data.chainIdToTokenAddressToTokenMetadata[chainId]) {
      data.chainIdToTokenAddressToTokenMetadata[chainId] = {}
    }

    if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId]) {
      data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId] = {}
    }

    tokens.forEach(token => {
      if (!data.chainIdToTokenAddressToTokenMetadata[chainId][token.address]) {
        data.chainIdToTokenAddressToTokenMetadata[chainId][token.address] = token
      }

      if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId][token.address]) {
        data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId][token.address] = token
      }
    })
  })
}

module.exports = processViperswapTokens
