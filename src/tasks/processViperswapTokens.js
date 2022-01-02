const path = require('path')

const axios = require('axios')
const tmp = require('tmp-promise')
const clone = require('git-clone/promise')

async function processViperswapTokens(data) {
  const dexMetadata = data.dexIdToDexMetadata.viperswap
  const dexId = dexMetadata.id

  console.log(`Parsing ${dexMetadata.__metadata__.tokensGitUrl}`)

  const tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexMetadata.__metadata__.tokensGitUrl, tmpDir.path)

  if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId]) {
    data.dexIdToChainIdTokenAddressToTokenMetadata[dexId] = {}
  }

  const url = require(path.join(tmpDir.path, dexMetadata.__metadata__.tokensLocation)).DEFAULT_ACTIVE_LIST_URLS[0]

  ;(await axios.get(url)).data.tokens.forEach(token => {
    if (!data.chainIdToTokenAddressToTokenMetadata[token.chainId]) {
      data.chainIdToTokenAddressToTokenMetadata[token.chainId] = {}
    }

    if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][token.chainId]) {
      data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][token.chainId] = {}
    }

    if (!data.chainIdToTokenAddressToTokenMetadata[token.chainId][token.address]) {
      data.chainIdToTokenAddressToTokenMetadata[token.chainId][token.address] = token
    }

    if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][token.chainId][token.address]) {
      data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][token.chainId][token.address] = token
    }
  })
}

module.exports = processViperswapTokens
