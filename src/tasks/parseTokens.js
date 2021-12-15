const fs = require('fs')
const path = require('path')

const tmp = require('tmp-promise')
const clone = require('git-clone/promise')

async function parseTokens(data, dexId) {
  const dexMetadata = data.dexIdToDexMetadata[dexId]

  console.log(`Parsing ${dexMetadata.tokensGitUrl}`)

  const tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexMetadata.tokensGitUrl, tmpDir.path)

  data.dexIdToChainIdTokenAddressToTokenMetadata[dexId] = {}

  fs.readdirSync(path.join(tmpDir.path, dexMetadata.tokensLocation))
  .forEach(file => {
    let json = []

    try {
      json = require(path.join(tmpDir.path, dexMetadata.tokensLocation, file))
    }
    catch (e) {
      console.log(`Error parsing ${dexMetadata.tokensGitUrl} JSON`, file)
    }

    if (!json.length) return

    const { chainId } = json[0]

    if (!data.chainIdToTokenAddressToTokenMetadata[chainId]) {
      data.chainIdToTokenAddressToTokenMetadata[chainId] = {}
    }

    if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId]) {
      data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId] = {}
    }

    json.forEach(token => {
      if (!data.chainIdToTokenAddressToTokenMetadata[chainId][token.address]) {
        data.chainIdToTokenAddressToTokenMetadata[chainId][token.address] = token
      }

      if (!data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId][token.address]) {
        data.dexIdToChainIdTokenAddressToTokenMetadata[dexId][chainId][token.address] = token
      }
    })
  })

  await tmpDir.cleanup()
}

module.exports = parseTokens
