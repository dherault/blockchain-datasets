const fs = require('fs')
const path = require('path')

const tmp = require('tmp-promise')
const clone = require('git-clone/promise')

async function parseTokens(data, dexId) {
  const dexMetadata = data.dexIdToDexMetadata[dexId]

  console.log(`Parsing ${dexMetadata.__metadata__.tokensGitUrl}`)

  const tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexMetadata.__metadata__.tokensGitUrl, tmpDir.path)

  data.dexIdToChainIdTokenAddressToTokenMetadata[dexId] = {}

  fs.readdirSync(path.join(tmpDir.path, dexMetadata.__metadata__.tokensLocation))
  .forEach(file => {
    let json = []

    try {
      json = require(path.join(tmpDir.path, dexMetadata.__metadata__.tokensLocation, file))
    }
    catch (e) {
      console.log(`Error parsing ${dexMetadata.__metadata__.tokensGitUrl} JSON`, file)
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
