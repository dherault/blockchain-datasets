const path = require('path')

const tmp = require('tmp-promise')
const clone = require('git-clone/promise')

async function parseSushiswapWrappedNativeTokens(data) {
  const dexMetadata = data.dexIdToDexMetadata.sushiswap

  console.log(`Parsing ${dexMetadata.__metadata__.sdkGitUrl}`)

  const tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexMetadata.__metadata__.sdkGitUrl, tmpDir.path)

  const chainIdToWrappedNativeTokenAddress = require(path.join(tmpDir.path, 'src/constants/addresses.ts')).WNATIVE_ADDRESS

  Object.entries(chainIdToWrappedNativeTokenAddress)
  .forEach(([chanId, wrappedNativeTokenAddress]) => {
    if (!data.chainIdToWrappedNativeTokenAddress[chanId]) {
      data.chainIdToWrappedNativeTokenAddress[chanId] = wrappedNativeTokenAddress
    }
  })
}

module.exports = parseSushiswapWrappedNativeTokens
